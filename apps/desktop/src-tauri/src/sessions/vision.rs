use chrono::Utc;
use local_store::models::{GuidanceSuggestion, ProviderCallRecord, SuggestionType};
use local_store::repositories::StoreRepositories;
use provider_core::tasks::ModelTask;
use provider_core::{
    SessionContextInput, VisionRequest,
};
use tauri::AppHandle;

use crate::providers::privacy::resolve_for_session;
use crate::providers::router::ResolvedProvider;
use crate::sessions::ai_activity;
use crate::sessions::guidance::{recent_transcript_context, GUIDANCE_TRANSCRIPT_LIMIT};
use crate::sessions::vision_image::prepare_image_data_url;
use crate::storage::AppState;

pub struct VisionAnalysisDto {
    pub suggestion: GuidanceSuggestion,
}

pub struct VisionService;

impl VisionService {
    pub async fn analyze_for_session(
        state: &AppState,
        session_id: &str,
        image_data_url: &str,
        source: &str,
        app: Option<&AppHandle>,
    ) -> Result<VisionAnalysisDto, String> {
        if !state.try_begin_guidance(session_id) {
            return Err("análise de imagem já em andamento; aguarde a anterior".into());
        }

        let result = async {
            let prepared_image =
                prepare_image_data_url(image_data_url).map_err(|e| e.to_string())?;
            let (prepared, provider) = state.with_repo_str(|repo| {
                Self::prepare(state, repo, session_id, &prepared_image, source)
            })?;
            let response = ai_activity::with_activity(app, session_id, "vision", || {
                crate::providers::adapter::request_vision_analysis(&provider, prepared)
            })
            .await
            .map_err(|e| e.to_string())?;
            let suggestion = state.with_repo_str(|repo| {
                Self::persist(repo, session_id, &provider, response)
            })?;
            Ok(VisionAnalysisDto { suggestion })
        }
        .await;

        state.end_guidance(session_id);
        result
    }

    fn prepare(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
        image_data_url: &str,
        source: &str,
    ) -> Result<(VisionRequest, ResolvedProvider), String> {
        let session = repo.get_session(session_id).map_err(|e| e.to_string())?;
        if session.status != local_store::models::SessionStatus::Listening
            && session.status != local_store::models::SessionStatus::Paused
        {
            return Err("sessão deve estar ativa para analisar imagem".into());
        }

        let provider =
            crate::providers::router::resolve_for_task(state, repo, ModelTask::Vision)?;

        let ctx = repo
            .get_session_context(session_id)
            .map_err(|e| e.to_string())?;
        let (recent, _) =
            recent_transcript_context(repo, session_id, GUIDANCE_TRANSCRIPT_LIMIT)?;

        let session_context = SessionContextInput {
            role: ctx.role.clone(),
            objective: ctx.objective.clone(),
            audience: ctx.audience.clone(),
            company_or_product_notes: ctx.company_or_product_notes.clone(),
            preferred_tone: ctx.preferred_tone.clone(),
            forbidden_topics: ctx.forbidden_topics.clone(),
            system_prompt: ctx.custom_prompts.clone(),
            assistant_preset_id: ctx.assistant_preset_id.clone(),
            pre_meeting_context: ctx.pre_meeting_context.clone(),
            pre_meeting_context_source: ctx.pre_meeting_context_source.clone(),
        };

        let privacy_mode = resolve_for_session(repo, &session, &provider)?;
        let request = VisionRequest {
            session_context,
            recent_transcript: recent,
            image_data_url: image_data_url.to_string(),
            privacy_mode,
            source: Some(source.to_string()),
        };

        Ok((request, provider))
    }

    fn persist(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        provider: &ResolvedProvider,
        response: provider_core::VisionResponse,
    ) -> Result<GuidanceSuggestion, String> {
        let finished = Utc::now();
        let provider_id = provider.id.clone();
        let suggestion = GuidanceSuggestion {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            trigger_segment_ids: vec![],
            suggestion_type: SuggestionType::TalkingPoint,
            text: response.text.clone(),
            rationale: Some(format!(
                "[Visão] {} — {}",
                response.title, response.grounding_summary
            )),
            confidence: response.confidence,
            provider_id: Some(provider_id.clone()),
            shown_at: Some(Utc::now()),
            copied_at: None,
            saved: false,
            created_at: Utc::now(),
        };
        repo.insert_suggestion(&suggestion)
            .map_err(|e| e.to_string())?;

        let call = ProviderCallRecord {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: Some(session_id.to_string()),
            provider_id: Some(provider_id),
            purpose: "vision".into(),
            local_or_hosted: if response.content_left_device {
                "local".into()
            } else {
                "hosted".into()
            },
            request_started_at: finished,
            request_finished_at: Some(finished),
            status: "success".into(),
            latency_ms: Some(response.latency_ms as i64),
            error_code: None,
        };
        repo.insert_provider_call(&call)
            .map_err(|e| e.to_string())?;

        Ok(suggestion)
    }
}

