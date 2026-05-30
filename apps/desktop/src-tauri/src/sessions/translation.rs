use chrono::Utc;
use local_store::models::{TranscriptSegment, TranslationSegment};
use local_store::repositories::StoreRepositories;
use local_store::translation_repository::TranslationRepository;
use provider_core::tasks::ModelTask;
use provider_core::transcription::normalize_language_code;
use provider_core::TranslationRequest;

use crate::logging::audit::{audit_translation_generated, audit_translation_low_confidence};
use crate::providers::adapter;
use crate::providers::privacy::resolve_for_session;
use crate::providers::router::ResolvedProvider;
use crate::storage::AppState;

pub struct PreparedTranslation {
    pub request: TranslationRequest,
    pub provider: ResolvedProvider,
}

pub struct AutoTranslationJob {
    pub prepared: PreparedTranslation,
    pub transcript_segment_id: String,
}

fn effective_translation_source(transcript_language: &str) -> String {
    // Returns empty string for unknown/auto-detected language so same_language_pair
    // never blocks translation when source is indeterminate. The translation prompt
    // uses "the source language" in that case and the LLM auto-detects it.
    normalize_language_code(transcript_language)
}

fn same_language_pair(source: &str, target: &str) -> bool {
    let src = normalize_language_code(source);
    let tgt = normalize_language_code(target);
    !src.is_empty() && !tgt.is_empty() && src == tgt
}

pub struct TranslationService;

impl TranslationService {
    pub fn set_target_language(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        target_language: &str,
    ) -> Result<(), String> {
        let target = if target_language.trim().is_empty() {
            None
        } else {
            Some(target_language)
        };
        TranslationRepository::new(repo.conn())
            .set_session_target_language(session_id, target)
            .map_err(|e| e.to_string())
    }

    pub fn prepare_translation(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
        transcript_segment_id: &str,
    ) -> Result<PreparedTranslation, String> {
        let provider =
            crate::providers::router::resolve_for_task(state, repo, ModelTask::Translation)?;
        let session = repo.get_session(session_id).map_err(|e| e.to_string())?;
        let target = session
            .target_language
            .clone()
            .ok_or_else(|| "target language not set for session".to_string())?;

        let transcript = repo
            .list_transcripts(session_id)
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|t| t.id == transcript_segment_id)
            .ok_or_else(|| "transcript segment not found".to_string())?;

        let context_hints = repo
            .get_session_context(session_id)
            .ok()
            .and_then(|ctx| ctx.custom_prompts.filter(|s| !s.trim().is_empty()));

        let source_language = effective_translation_source(&transcript.language);
        let privacy_mode = resolve_for_session(repo, &session, &provider)?;

        Ok(PreparedTranslation {
            request: TranslationRequest {
                source_language,
                target_language: target,
                text: transcript.text.clone(),
                context_hints,
                privacy_mode,
            },
            provider,
        })
    }

    pub async fn fetch_translation(
        prepared: &PreparedTranslation,
    ) -> Result<provider_core::TranslationResponse, String> {
        adapter::request_translation(&prepared.provider, prepared.request.clone())
            .await
            .map_err(|e| e.to_string())
    }

    pub fn persist_translation(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        transcript_segment_id: &str,
        prepared: &PreparedTranslation,
        response: provider_core::TranslationResponse,
    ) -> Result<TranslationSegment, String> {
        let segment = TranslationSegment {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            transcript_segment_id: transcript_segment_id.to_string(),
            source_language: prepared.request.source_language.clone(),
            target_language: prepared.request.target_language.clone(),
            text: response.text.clone(),
            confidence: response.confidence,
            is_uncertain: response.is_uncertain,
            provider_id: Some(prepared.provider.id.clone()),
            created_at: Utc::now(),
        };
        TranslationRepository::new(repo.conn())
            .insert(&segment)
            .map_err(|e| e.to_string())?;

        audit_translation_generated(
            repo,
            session_id,
            &segment.id,
            response.content_left_device,
            response.confidence,
        )?;

        if response.is_uncertain || response.confidence < 0.6 {
            audit_translation_low_confidence(repo, session_id, &segment.id, response.confidence)?;
        }

        Ok(segment)
    }

    #[allow(dead_code)]
    pub async fn translate_transcript_segment(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
        transcript_segment_id: &str,
    ) -> Result<TranslationSegment, String> {
        let prepared =
            Self::prepare_translation(state, repo, session_id, transcript_segment_id)?;
        let response = Self::fetch_translation(&prepared).await?;
        Self::persist_translation(
            repo,
            session_id,
            transcript_segment_id,
            &prepared,
            response,
        )
    }

    pub fn prepare_auto_translate(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
        latest: &TranscriptSegment,
    ) -> Result<Option<AutoTranslationJob>, String> {
        let target = TranslationRepository::new(repo.conn())
            .get_session_target_language(session_id)
            .map_err(|e| e.to_string())?;
        if target.is_none() {
            return Ok(None);
        }
        if TranslationRepository::new(repo.conn())
            .find_by_transcript(&latest.id)
            .map_err(|e| e.to_string())?
            .is_some()
        {
            return Ok(None);
        }
        let prepared = Self::prepare_translation(state, repo, session_id, &latest.id)?;
        if same_language_pair(
            &prepared.request.source_language,
            &prepared.request.target_language,
        ) {
            return Ok(None);
        }
        Ok(Some(AutoTranslationJob {
            prepared,
            transcript_segment_id: latest.id.clone(),
        }))
    }

    pub fn persist_auto_translate(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        job: &AutoTranslationJob,
        response: provider_core::TranslationResponse,
    ) -> Result<TranslationSegment, String> {
        Self::persist_translation(
            repo,
            session_id,
            &job.transcript_segment_id,
            &job.prepared,
            response,
        )
    }
}
