use chrono::{DateTime, Utc};
use local_store::models::{GuidanceSuggestion, ProviderCallRecord, SuggestionType};
use local_store::repositories::StoreRepositories;
use provider_core::tasks::ModelTask;
use provider_core::{
    GuidanceRequest, GuidanceResponse, SessionContextInput, TranscriptSnippet,
};
use tauri::AppHandle;

use crate::sessions::ai_activity;
use crate::logging::audit::{
    audit_follow_up_suggested, audit_guidance_generated, audit_objection_handled,
};
use crate::documents::attachment::{
    load_pages_as_data_urls, parse_pages_json,
};
use crate::providers::privacy::resolve_for_session;
use crate::providers::router::ResolvedProvider;
use crate::sessions::guidance_classifier::GuidanceClassifier;
use crate::storage::AppState;

pub struct PreparedGuidance {
    pub request: GuidanceRequest,
    pub trigger_segment_ids: Vec<String>,
    pub started_at: DateTime<Utc>,
    pub classified_type: provider_core::SuggestionType,
    pub provider: ResolvedProvider,
}

pub struct GuidanceService;

impl GuidanceService {
    pub fn prepare(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
    ) -> Result<PreparedGuidance, String> {
        Self::prepare_with_limit(state, repo, session_id, GUIDANCE_TRANSCRIPT_LIMIT)
    }

    pub fn prepare_with_limit(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
        transcript_limit: usize,
    ) -> Result<PreparedGuidance, String> {
        let session = repo.get_session(session_id).map_err(|e| e.to_string())?;
        if session.status != local_store::models::SessionStatus::Listening
            && session.status != local_store::models::SessionStatus::Paused
        {
            return Err("session must be listening or paused to request guidance".into());
        }

        let ctx = repo
            .get_session_context(session_id)
            .map_err(|e| e.to_string())?;
        let page_paths = parse_pages_json(&ctx.pre_meeting_attachment_pages);
        let context_image_data_urls = if page_paths.is_empty() {
            Vec::new()
        } else {
            load_pages_as_data_urls(&state.data_dir, &page_paths)?
        };

        let provider = if context_image_data_urls.is_empty() {
            crate::providers::router::resolve_for_task(state, repo, ModelTask::Guidance)?
        } else {
            crate::providers::router::resolve_for_task(state, repo, ModelTask::Vision)
                .or_else(|_| {
                    crate::providers::router::resolve_for_task(state, repo, ModelTask::Guidance)
                })?
        };

        let (recent, trigger_segment_ids) =
            recent_transcript_context(repo, session_id, transcript_limit)?;

        let session_context = SessionContextInput {
            role: ctx.role.clone(),
            objective: ctx.objective.clone(),
            audience: ctx.audience.clone(),
            company_or_product_notes: merge_scenario_notes(
                ctx.company_or_product_notes.clone(),
                &ctx,
                &recent,
            ),
            preferred_tone: ctx.preferred_tone.clone(),
            forbidden_topics: ctx.forbidden_topics.clone(),
            system_prompt: ctx.custom_prompts.clone(),
            assistant_preset_id: ctx.assistant_preset_id.clone(),
            pre_meeting_context: ctx.pre_meeting_context.clone(),
            pre_meeting_context_source: ctx.pre_meeting_context_source.clone(),
        };

        let classified = GuidanceClassifier::classify(&session_context, &recent);
        let privacy_mode = resolve_for_session(repo, &session, &provider)?;

        Ok(PreparedGuidance {
            request: GuidanceRequest {
                session_context,
                recent_transcript: recent,
                suggestion_type: Some(classified.suggestion_type),
                privacy_mode,
                context_image_data_urls,
            },
            trigger_segment_ids,
            started_at: Utc::now(),
            classified_type: classified.suggestion_type,
            provider,
        })
    }

    pub async fn fetch_provider(prepared: &PreparedGuidance) -> Result<GuidanceResponse, String> {
        crate::providers::adapter::request_guidance(&prepared.provider, prepared.request.clone())
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn generate_contextual_for_session(
        state: &AppState,
        session_id: &str,
        app: Option<&AppHandle>,
    ) -> Result<GuidanceSuggestion, String> {
        if !state.try_begin_guidance(session_id) {
            return Err("orientação já em andamento; aguarde a resposta anterior".into());
        }
        let result = async {
            let prepared = state.with_repo_str(|repo| {
                Self::prepare_with_limit(state, repo, session_id, GUIDANCE_TRANSCRIPT_LIMIT)
            })?;
            let response = ai_activity::with_activity(app, session_id, "guidance", || {
                Self::fetch_provider(&prepared)
            })
            .await?;
            state.with_repo_str(|repo| Self::persist(repo, session_id, prepared, response))
        }
        .await;
        state.end_guidance(session_id);
        result
    }

    /// Generates guidance from recent transcript segments via the routed provider.
    pub async fn generate_for_session(
        state: &AppState,
        session_id: &str,
        app: Option<&AppHandle>,
    ) -> Result<Option<GuidanceSuggestion>, String> {
        if !state.try_begin_guidance(session_id) {
            return Ok(None);
        }
        let result = async {
            let prepared = state.with_repo_str(|repo| Self::prepare(state, repo, session_id))?;
            let response = ai_activity::with_activity(app, session_id, "guidance", || {
                Self::fetch_provider(&prepared)
            })
            .await?;
            state.with_repo_str(|repo| Self::persist(repo, session_id, prepared, response))
        }
        .await;
        state.end_guidance(session_id);
        match result {
            Ok(s) => Ok(Some(s)),
            Err(e) => Err(e),
        }
    }

    pub fn persist(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        prepared: PreparedGuidance,
        response: GuidanceResponse,
    ) -> Result<GuidanceSuggestion, String> {
        let finished = Utc::now();
        let store_type = map_suggestion_type(response.suggestion_type);
        let provider_id = prepared.provider.id.clone();
        let suggestion = GuidanceSuggestion {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            trigger_segment_ids: prepared.trigger_segment_ids,
            suggestion_type: store_type,
            text: response.text.clone(),
            rationale: Some(response.grounding_summary.clone()),
            confidence: response.confidence,
            provider_id: Some(provider_id.clone()),
            shown_at: Some(finished),
            copied_at: None,
            saved: false,
            created_at: finished,
        };
        repo.insert_suggestion(&suggestion)
            .map_err(|e| e.to_string())?;

        let call = ProviderCallRecord {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: Some(session_id.to_string()),
            provider_id: Some(provider_id.clone()),
            purpose: "guidance".into(),
            local_or_hosted: if response.content_left_device {
                "hosted".into()
            } else {
                "local".into()
            },
            request_started_at: prepared.started_at,
            request_finished_at: Some(finished),
            status: "success".into(),
            latency_ms: Some(response.latency_ms as i64),
            error_code: None,
        };
        repo.insert_provider_call(&call)
            .map_err(|e| e.to_string())?;

        if response.content_left_device {
            let _ = crate::logging::audit::audit_hosted_provider_call(
                repo,
                session_id,
                &provider_id,
                "guidance",
                response.latency_ms,
            );
        }

        audit_guidance_generated(
            repo,
            session_id,
            &suggestion.id,
            prepared.classified_type,
            response.confidence,
            &call.local_or_hosted,
        )?;

        if response.suggestion_type == provider_core::SuggestionType::ObjectionResponse {
            audit_objection_handled(repo, session_id, &suggestion.id, response.confidence)?;
        }
        if response.suggestion_type == provider_core::SuggestionType::FollowUpQuestion
            || response.suggestion_type == provider_core::SuggestionType::NextStep
        {
            audit_follow_up_suggested(
                repo,
                session_id,
                &suggestion.id,
                response.suggestion_type,
                response.confidence,
            )?;
        }

        Ok(suggestion)
    }
}

/// Trechos de transcrição enviados ao modelo ao pedir orientação (contexto conversacional).
pub const GUIDANCE_TRANSCRIPT_LIMIT: usize = 30;

pub(crate) fn recent_transcript_context(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    limit: usize,
) -> Result<(Vec<TranscriptSnippet>, Vec<String>), String> {
    let segments = repo
        .list_transcripts_recent(session_id, limit)
        .map_err(|e| e.to_string())?;
    let recent: Vec<TranscriptSnippet> = segments
        .iter()
        .map(|t| TranscriptSnippet {
            speaker_label: t.speaker_label.clone(),
            text: t.text.clone(),
            confidence: t.confidence,
        })
        .collect();
    let trigger_start = segments.len().saturating_sub(5);
    let trigger_segment_ids: Vec<String> = segments[trigger_start..]
        .iter()
        .map(|t| t.id.clone())
        .collect();
    Ok((recent, trigger_segment_ids))
}

fn merge_scenario_notes(
    notes: Option<String>,
    ctx: &local_store::models::SessionContext,
    recent: &[TranscriptSnippet],
) -> Option<String> {
    let input = SessionContextInput {
        role: ctx.role.clone(),
        objective: ctx.objective.clone(),
        audience: ctx.audience.clone(),
        company_or_product_notes: notes.clone(),
        preferred_tone: ctx.preferred_tone.clone(),
        forbidden_topics: ctx.forbidden_topics.clone(),
        system_prompt: ctx.custom_prompts.clone(),
        assistant_preset_id: ctx.assistant_preset_id.clone(),
        pre_meeting_context: ctx.pre_meeting_context.clone(),
        pre_meeting_context_source: ctx.pre_meeting_context_source.clone(),
    };
    let classified = GuidanceClassifier::classify(&input, recent);
    let hint = classified.scenario_hint;
    match notes {
        Some(n) if !n.is_empty() => Some(format!("{n}\n{hint}")),
        _ => Some(hint),
    }
}

fn map_suggestion_type(t: provider_core::SuggestionType) -> SuggestionType {
    match t {
        provider_core::SuggestionType::Answer => SuggestionType::Answer,
        provider_core::SuggestionType::ObjectionResponse => SuggestionType::ObjectionResponse,
        provider_core::SuggestionType::FollowUpQuestion => SuggestionType::FollowUpQuestion,
        provider_core::SuggestionType::TalkingPoint => SuggestionType::TalkingPoint,
        provider_core::SuggestionType::NextStep => SuggestionType::NextStep,
        provider_core::SuggestionType::Fallback => SuggestionType::Fallback,
    }
}
