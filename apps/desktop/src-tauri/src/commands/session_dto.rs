use local_store::models::{GuidanceSuggestion, TranscriptSegment, TranslationSegment};
use local_store::translation_repository::TranslationRepository;
use serde::Serialize;

use crate::commands::context_commands::SessionContextDto;
use crate::logging::performance::{PerfSpan, PerformanceMetric};
use crate::sessions::live_pipeline::{
    LIVE_SUGGESTION_LIMIT, LIVE_TRANSLATION_LIMIT, LIVE_TRANSCRIPT_LIMIT,
};
use crate::storage::AppState;

#[derive(Debug, Serialize)]
pub struct SessionDto {
    pub id: String,
    pub title: String,
    pub status: String,
    pub target_language: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptDto {
    pub id: String,
    pub speaker_label: Option<String>,
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SuggestionDto {
    pub id: String,
    pub text: String,
    pub suggestion_type: String,
    pub confidence: f32,
    pub rationale: Option<String>,
    pub saved: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranslationDto {
    pub id: String,
    pub transcript_segment_id: String,
    pub source_language: String,
    pub target_language: String,
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
}

#[derive(Debug, Serialize)]
pub struct LiveSessionStateDto {
    pub session: Option<SessionDto>,
    pub context: Option<SessionContextDto>,
    pub transcripts: Vec<TranscriptDto>,
    pub translations: Vec<TranslationDto>,
    pub suggestions: Vec<SuggestionDto>,
    pub transcripts_total: usize,
    pub translations_total: usize,
    pub suggestions_total: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptTickUpdateDto {
    pub new_transcript: TranscriptDto,
    pub new_translation: Option<TranslationDto>,
    pub new_guidance: Option<GuidanceUpdateDto>,
    pub guidance_error: Option<String>,
    pub translation_error: Option<String>,
    pub transcripts_total: usize,
    pub translations_total: usize,
    pub suggestions_total: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct GuidanceUpdateDto {
    pub new_suggestion: SuggestionDto,
    pub suggestions_total: usize,
}

pub(crate) fn suggestion_type_name(t: local_store::models::SuggestionType) -> String {
    match t {
        local_store::models::SuggestionType::Answer => "answer".into(),
        local_store::models::SuggestionType::ObjectionResponse => "objection_response".into(),
        local_store::models::SuggestionType::FollowUpQuestion => "follow_up_question".into(),
        local_store::models::SuggestionType::TalkingPoint => "talking_point".into(),
        local_store::models::SuggestionType::NextStep => "next_step".into(),
        local_store::models::SuggestionType::Fallback => "fallback".into(),
    }
}

fn status_name(s: local_store::models::SessionStatus) -> String {
    match s {
        local_store::models::SessionStatus::Draft => "draft".into(),
        local_store::models::SessionStatus::Listening => "listening".into(),
        local_store::models::SessionStatus::Paused => "paused".into(),
        local_store::models::SessionStatus::Reconnecting => "reconnecting".into(),
        local_store::models::SessionStatus::Ended => "ended".into(),
        local_store::models::SessionStatus::Failed => "failed".into(),
        local_store::models::SessionStatus::Deleted => "deleted".into(),
    }
}

pub fn session_dto_from(s: local_store::models::Session) -> SessionDto {
    SessionDto {
        id: s.id,
        title: s.title,
        status: status_name(s.status),
        target_language: s.target_language,
    }
}

pub fn transcript_dto_from(segment: &TranscriptSegment) -> TranscriptDto {
    TranscriptDto {
        id: segment.id.clone(),
        speaker_label: segment.speaker_label.clone(),
        text: segment.text.clone(),
        confidence: segment.confidence,
        is_uncertain: segment.is_uncertain,
    }
}

pub fn translation_dto_from(t: &TranslationSegment) -> TranslationDto {
    TranslationDto {
        id: t.id.clone(),
        transcript_segment_id: t.transcript_segment_id.clone(),
        source_language: t.source_language.clone(),
        target_language: t.target_language.clone(),
        text: t.text.clone(),
        confidence: t.confidence,
        is_uncertain: t.is_uncertain,
    }
}

pub fn suggestion_dto_from(s: &GuidanceSuggestion) -> SuggestionDto {
    SuggestionDto {
        id: s.id.clone(),
        text: s.text.clone(),
        suggestion_type: suggestion_type_name(s.suggestion_type),
        confidence: s.confidence,
        rationale: s.rationale.clone(),
        saved: s.saved,
    }
}

pub fn tick_update_from_result(
    result: crate::sessions::live_pipeline::TranscriptTickResult,
) -> TranscriptTickUpdateDto {
    let new_guidance = result.new_guidance.as_ref().map(|s| GuidanceUpdateDto {
        new_suggestion: suggestion_dto_from(s),
        suggestions_total: result.suggestions_total,
    });
    TranscriptTickUpdateDto {
        new_transcript: transcript_dto_from(&result.new_transcript),
        new_translation: result.new_translation.as_ref().map(translation_dto_from),
        new_guidance,
        guidance_error: result.guidance_error,
        translation_error: result.translation_error,
        transcripts_total: result.transcripts_total,
        translations_total: result.translations_total,
        suggestions_total: result.suggestions_total,
    }
}

#[derive(Debug, Serialize)]
pub struct OverlaySessionSnapshotDto {
    pub session_id: Option<String>,
    pub status: Option<String>,
    pub last_transcript: Option<TranscriptDto>,
    pub last_translation: Option<TranslationDto>,
    pub last_suggestion: Option<SuggestionDto>,
    pub guidance_in_flight: bool,
}

pub fn build_overlay_snapshot(state: &AppState) -> Result<OverlaySessionSnapshotDto, String> {
    let session_id = state.active_session_id();
    let Some(ref sid) = session_id else {
        return Ok(OverlaySessionSnapshotDto {
            session_id: None,
            status: None,
            last_transcript: None,
            last_translation: None,
            last_suggestion: None,
            guidance_in_flight: false,
        });
    };
    state.with_repo(|repo| {
        let session = repo.get_session(sid)?;
        let transcripts = repo.list_transcripts_recent(sid, 1)?;
        let suggestions = repo.list_suggestions_recent(sid, 1)?;
        let translation_repo = TranslationRepository::new(repo.conn());
        let translations = translation_repo.list_for_session_recent(sid, 1)?;
        Ok(OverlaySessionSnapshotDto {
            session_id: Some(sid.clone()),
            status: Some(status_name(session.status)),
            last_transcript: transcripts.first().map(transcript_dto_from),
            last_translation: translations.first().map(translation_dto_from),
            last_suggestion: suggestions.first().map(suggestion_dto_from),
            guidance_in_flight: state.is_guidance_in_flight(sid),
        })
    })
}

pub fn guidance_update_from(
    suggestion: GuidanceSuggestion,
    suggestions_total: usize,
) -> GuidanceUpdateDto {
    GuidanceUpdateDto {
        new_suggestion: suggestion_dto_from(&suggestion),
        suggestions_total,
    }
}

pub(crate) fn build_live_state(
    state: &AppState,
    session_id: &str,
) -> Result<LiveSessionStateDto, String> {
    let ui_span = PerfSpan::start(PerformanceMetric::UiStateBuild, Some(session_id));
    let result = state.with_repo(|repo| {
        let session = repo.get_session(session_id)?;
        let transcripts_total = repo.count_transcripts(session_id)?;
        let suggestions_total = repo.count_suggestions(session_id)?;
        let translation_repo = TranslationRepository::new(repo.conn());
        let translations_total = translation_repo.count_for_session(session_id)?;

        let transcripts = repo.list_transcripts_recent(session_id, LIVE_TRANSCRIPT_LIMIT)?;
        let suggestions = repo.list_suggestions_recent(session_id, LIVE_SUGGESTION_LIMIT)?;
        let translations =
            translation_repo.list_for_session_recent(session_id, LIVE_TRANSLATION_LIMIT)?;
        let ctx = repo.get_session_context(session_id)?;
        Ok(LiveSessionStateDto {
            session: Some(session_dto_from(session)),
            context: Some(crate::commands::context_commands::context_dto(ctx)),
            transcripts: transcripts.iter().map(transcript_dto_from).collect(),
            translations: translations.iter().map(translation_dto_from).collect(),
            suggestions: suggestions.iter().map(suggestion_dto_from).collect(),
            transcripts_total,
            translations_total,
            suggestions_total,
        })
    });
    if result.is_ok() {
        let _ = state.with_repo(|repo| {
            ui_span.finish(repo);
            Ok(())
        });
    }
    result
}
