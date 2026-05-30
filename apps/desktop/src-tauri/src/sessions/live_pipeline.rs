use audio_core::simulated::SimulatedTranscriptSource;
use local_store::models::{GuidanceSuggestion, TranscriptSegment, TranslationSegment};
use local_store::translation_repository::TranslationRepository;
use tauri::AppHandle;

use crate::audio::transcription::TranscriptionService;
use crate::sessions::ai_activity;
use crate::sessions::translation::TranslationService;
use crate::storage::AppState;

pub const LIVE_TRANSCRIPT_LIMIT: usize = 100;
pub const LIVE_TRANSLATION_LIMIT: usize = 100;
pub const LIVE_SUGGESTION_LIMIT: usize = 50;

pub const LIVE_TRANSCRIPT_INTERVAL_SECS: u64 = 10;

pub struct TranscriptTickResult {
    pub new_transcript: TranscriptSegment,
    pub new_translation: Option<TranslationSegment>,
    pub new_guidance: Option<GuidanceSuggestion>,
    pub guidance_error: Option<String>,
    pub translation_error: Option<String>,
    pub transcripts_total: usize,
    pub translations_total: usize,
    pub suggestions_total: usize,
}

/// Ingest one transcript segment: optional auto-translation only (no auto-guidance).
pub async fn ingest_transcript_segment(
    state: &AppState,
    session_id: &str,
    segment: TranscriptSegment,
    app: Option<&AppHandle>,
) -> Result<TranscriptTickResult, String> {
    let mut new_translation = None;
    let mut translation_error = None;

    let job = state.with_repo_str(|repo| {
        TranslationService::prepare_auto_translate(state, repo, session_id, &segment)
    })?;

    if let Some(job) = job {
        match ai_activity::with_activity(app, session_id, "translation", || {
            TranslationService::fetch_translation(&job.prepared)
        })
        .await
        {
            Ok(response) => {
                let persisted = state.with_repo_str(|repo| {
                    TranslationService::persist_auto_translate(repo, session_id, &job, response)
                })?;
                new_translation = Some(persisted);
            }
            Err(e) => translation_error = Some(e),
        }
    }

    let (transcripts_total, translations_total, suggestions_total) = state.with_repo(|repo| {
        let transcripts_total = repo.count_transcripts(session_id)?;
        let translation_repo = TranslationRepository::new(repo.conn());
        let translations_total = translation_repo.count_for_session(session_id)?;
        let suggestions_total = repo.count_suggestions(session_id)?;
        Ok((transcripts_total, translations_total, suggestions_total))
    })?;

    Ok(TranscriptTickResult {
        new_transcript: segment,
        new_translation,
        new_guidance: None,
        guidance_error: None,
        translation_error,
        transcripts_total,
        translations_total,
        suggestions_total,
    })
}

pub async fn ingest_live_transcript_segment(
    state: &AppState,
    session_id: &str,
    text: &str,
    speaker_label: Option<String>,
    language: &str,
    app: Option<&AppHandle>,
) -> Result<TranscriptTickResult, String> {
    let segment = state.with_repo_str(|repo| {
        crate::audio::transcription::TranscriptionService::ingest_live(
            repo,
            session_id,
            text,
            speaker_label,
            language,
        )
    })?;
    ingest_transcript_segment(state, session_id, segment, app).await
}

pub async fn ingest_simulated_tick(
    state: &AppState,
    session_id: &str,
    app: Option<&AppHandle>,
) -> Result<TranscriptTickResult, String> {
    let segment = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let repo = local_store::repositories::StoreRepositories::new(&db);
        let mut sims = state.simulators.lock().map_err(|e| e.to_string())?;
        let source = sims
            .entry(session_id.to_string())
            .or_insert_with(SimulatedTranscriptSource::new);
        TranscriptionService::ingest_simulated_tick(&repo, session_id, source)?
    };
    ingest_transcript_segment(state, session_id, segment, app).await
}
