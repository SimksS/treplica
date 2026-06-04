use chrono::Utc;
use local_store::models::{SessionStatus, TranscriptSegment};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::commands::session_dto::{
    build_live_state, guidance_update_from, session_dto_from, tick_update_from_result,
    GuidanceUpdateDto, LiveSessionStateDto, SessionDto, TranscriptDto, TranscriptTickUpdateDto,
};
use crate::commands::CommandResponse;
use crate::logging::performance::{PerfSpan, PerformanceMetric};
use crate::sessions::ai_activity;
use crate::sessions::guidance::GuidanceService;
use crate::sessions::vision::VisionService;
use crate::audio::system_stt::SystemSttService;
use crate::sessions::live_pipeline::{ingest_live_transcript_segment, ingest_simulated_tick};
use crate::sessions::service::SessionService;
use crate::sessions::suggestions::SuggestionActions;
use crate::storage::AppState;

#[derive(Debug, serde::Serialize)]
pub struct ActiveSessionSummaryDto {
    pub session_id: String,
    pub title: String,
    pub status: String,
}

fn active_session_status_str(s: SessionStatus) -> String {
    match s {
        SessionStatus::Draft => "draft",
        SessionStatus::Listening => "listening",
        SessionStatus::Paused => "paused",
        SessionStatus::Reconnecting => "reconnecting",
        SessionStatus::Ended => "ended",
        SessionStatus::Failed => "failed",
        SessionStatus::Deleted => "deleted",
    }
    .into()
}

pub(crate) fn active_session_requires_leave_prompt(state: &AppState) -> Result<bool, String> {
    let Some(sid) = state.active_session_id() else {
        return Ok(false);
    };
    let in_progress = state.with_repo(|repo| {
        let session = repo.get_session(&sid)?;
        Ok(SessionService::session_is_in_progress(session.status))
    })?;
    if !in_progress {
        state.set_active_session(None);
    }
    Ok(in_progress)
}

#[tauri::command]
pub fn acknowledge_session_hosted_data(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<bool>, ()> {
    match state.with_repo(|repo| repo.set_session_hosted_data_acknowledged(&session_id, true)) {
        Ok(session) => Ok(CommandResponse::success(session.hosted_data_acknowledged)),
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub fn get_active_session_summary(
    state: State<'_, AppState>,
) -> Result<CommandResponse<Option<ActiveSessionSummaryDto>>, ()> {
    let Some(sid) = state.active_session_id() else {
        return Ok(CommandResponse::success(None));
    };
    match state.with_repo(|repo| {
        let session = repo.get_session(&sid)?;
        if !SessionService::session_is_in_progress(session.status) {
            state.set_active_session(None);
            return Ok(None);
        }
        Ok(Some(ActiveSessionSummaryDto {
            session_id: session.id,
            title: session.title,
            status: active_session_status_str(session.status),
        }))
    }) {
        Ok(summary) => Ok(CommandResponse::success(summary)),
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    title: Option<String>,
) -> Result<CommandResponse<SessionDto>, ()> {
    let title = title.unwrap_or_else(|| "Nova reunião".into());
    match state.with_repo_str(|repo| SessionService::create(repo, &title)) {
        Ok(s) => {
            let mut sims = state.simulators.lock().map_err(|_| ())?;
            sims.insert(
                s.id.clone(),
                audio_core::simulated::SimulatedTranscriptSource::new(),
            );
            Ok(CommandResponse::success(session_dto_from(s)))
        }
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub async fn start_session(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<SessionDto>, ()> {
    match state.with_repo_str(|repo| SessionService::start(repo, &session_id)) {
        Ok(s) => {
            state.set_active_session(Some(session_id.clone()));
            state.live_listeners.start(&app, &session_id);
            Ok(CommandResponse::success(session_dto_from(s)))
        }
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub async fn pause_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<SessionDto>, ()> {
    match state.with_repo_str(|repo| SessionService::pause(repo, &session_id)) {
        Ok(s) => {
            state.live_listeners.pause(&session_id);
            crate::commands::audio_capture_commands::stop_native_system_audio_internal(
                &state, None,
            );
            crate::commands::audio_capture_commands::stop_native_microphone_internal(&state, None);
            Ok(CommandResponse::success(session_dto_from(s)))
        }
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub async fn resume_session(
    _app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<SessionDto>, ()> {
    match state.with_repo_str(|repo| SessionService::resume(repo, &session_id)) {
        Ok(s) => {
            state.live_listeners.resume(&session_id);
            Ok(CommandResponse::success(session_dto_from(s)))
        }
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub async fn end_session(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<SessionDto>, ()> {
    state.live_listeners.stop(&session_id);
    crate::commands::audio_capture_commands::stop_native_system_audio_internal(&state, None);
    crate::commands::audio_capture_commands::stop_native_microphone_internal(&state, None);
    if state.active_session_id().as_deref() == Some(session_id.as_str()) {
        state.set_active_session(None);
    }
    if let Ok(mut sims) = state.simulators.lock() {
        sims.remove(&session_id);
    }
    match state.with_repo_str(|repo| SessionService::end(repo, &session_id)) {
        Ok(s) => {
            // Clear the guidance lock only after the DB write succeeds so that a DB
            // failure does not leave the lock cleared while the session is still live.
            state.end_guidance(&session_id);
            // Encerra a "conversa" com a IA: descarta a memória da sessão para que a
            // próxima sessão comece um diálogo novo, sem contexto da anterior.
            state.clear_guidance_memory(&session_id);
            // Broadcast to all windows so each window's React state can reset,
            // regardless of which window initiated the end_session call.
            let _ = app.emit("session-ended", &session_id);
            Ok(CommandResponse::success(session_dto_from(s)))
        }
        Err(e) => Ok(CommandResponse::failure("session_error", e)),
    }
}

#[tauri::command]
pub async fn append_transcript(
    state: State<'_, AppState>,
    session_id: String,
    text: String,
    speaker_label: Option<String>,
) -> Result<CommandResponse<TranscriptDto>, ()> {
    let segment = TranscriptSegment {
        id: Uuid::new_v4().to_string(),
        session_id: session_id.clone(),
        speaker_label,
        started_at_ms: 0,
        ended_at_ms: 1000,
        language: "pt-BR".into(),
        text: text.clone(),
        confidence: 0.9,
        is_uncertain: false,
        source: "manual".into(),
        created_at: Utc::now(),
    };
    match state.with_repo(|repo| {
        repo.insert_transcript(&segment)?;
        Ok(segment)
    }) {
        Ok(s) => Ok(CommandResponse::success(crate::commands::session_dto::transcript_dto_from(&s))),
        Err(e) => Ok(CommandResponse::failure("transcript_error", e)),
    }
}

#[tauri::command]
pub async fn simulate_transcript_tick(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<TranscriptTickUpdateDto>, ()> {
    #[cfg(not(debug_assertions))]
    {
        return Ok(CommandResponse::failure(
            "simulation_disabled",
            "Simulação de transcrição não está disponível em builds de produção",
        ));
    }
    let perf = PerfSpan::start(PerformanceMetric::TranscriptUpdate, Some(&session_id));
    match ingest_simulated_tick(&state, &session_id, Some(&app)).await {
        Ok(result) => {
            let dto = tick_update_from_result(result);
            let _ = state.with_repo(|repo| {
                perf.finish(repo);
                Ok(())
            });
            Ok(CommandResponse::success(dto))
        }
        Err(e) => Ok(CommandResponse::failure("simulation_error", e)),
    }
}

#[tauri::command]
pub async fn ingest_system_audio_chunk(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    audio_base64: String,
    mime_type: Option<String>,
    language: Option<String>,
    source_language: Option<String>,
    speaker_label: Option<String>,
    capture_mode: Option<String>,
) -> Result<CommandResponse<TranscriptTickUpdateDto>, ()> {
    use base64::Engine;
    const MAX_AUDIO_BASE64_LEN: usize = 16 * 1024 * 1024;
    if audio_base64.len() > MAX_AUDIO_BASE64_LEN {
        return Ok(CommandResponse::failure(
            "audio_too_large",
            "áudio excede o limite de 16 MB",
        ));
    }
    let bytes = match base64::engine::general_purpose::STANDARD.decode(audio_base64.trim()) {
        Ok(b) => b,
        Err(e) => {
            return Ok(CommandResponse::failure(
                "audio_decode_error",
                format!("invalid base64 audio: {e}"),
            ));
        }
    };
    let mime = mime_type.unwrap_or_else(|| "audio/webm".into());
    let source = source_language
        .or(language)
        .filter(|s| !s.trim().is_empty());

    let rate_limiter = if capture_mode.as_deref() == Some("microphone") {
        &state.stt_rate_limit_mic
    } else {
        &state.stt_rate_limit_system
    };
    if !rate_limiter.can_send_now() {
        return Ok(CommandResponse::failure(
            "transcription_rate_limited",
            "Aguarde um instante antes do próximo trecho de áudio (limite de requisições do provedor).",
        ));
    }
    rate_limiter.mark_sent();

    let stt = match ai_activity::with_activity(
        Some(&app),
        &session_id,
        "transcription",
        || {
            SystemSttService::transcribe_chunk(
                &state,
                &session_id,
                bytes,
                String::new(),
                mime,
                source.clone(),
            )
        },
    )
    .await
    {
        Ok(r) => r,
        Err(e) => {
            if crate::audio::stt_failure::transcription_is_no_speech(&e) {
                return Ok(CommandResponse::failure(
                    "transcription_no_speech",
                    crate::audio::stt_failure::friendly_transcription_message(&e),
                ));
            }
            return Ok(crate::audio::stt_failure::transcription_failure_response(e));
        }
    };

    let speaker = speaker_label
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Sistema".into());

    match ingest_live_transcript_segment(
        &state,
        &session_id,
        &stt.text,
        Some(speaker),
        &stt.transcript_language,
        Some(&app),
    )
    .await
    {
        Ok(result) => {
            let dto = tick_update_from_result(result);
            let _ = app.emit("live-transcript-tick", &dto);
            Ok(CommandResponse::success(dto))
        }
        Err(e) => Ok(CommandResponse::failure("transcript_error", e)),
    }
}

#[tauri::command]
pub async fn ingest_live_transcript(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    text: String,
    speaker_label: Option<String>,
    language: Option<String>,
) -> Result<CommandResponse<TranscriptTickUpdateDto>, ()> {
    let lang = language.unwrap_or_else(|| "pt-BR".into());
    match ingest_live_transcript_segment(
        &state,
        &session_id,
        &text,
        speaker_label,
        &lang,
        Some(&app),
    )
    .await
    {
        Ok(result) => {
            let dto = tick_update_from_result(result);
            let _ = app.emit("live-transcript-tick", &dto);
            Ok(CommandResponse::success(dto))
        }
        Err(e) => Ok(CommandResponse::failure("transcript_error", e)),
    }
}

#[tauri::command]
pub async fn analyze_session_image(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    image_data_url: String,
    source: Option<String>,
) -> Result<CommandResponse<GuidanceUpdateDto>, ()> {
    let perf = PerfSpan::start(PerformanceMetric::Guidance, Some(&session_id));
    let src = source.unwrap_or_else(|| "upload".into());
    match VisionService::analyze_for_session(
        &state,
        &session_id,
        &image_data_url,
        &src,
        Some(&app),
    )
    .await
    {
        Ok(result) => {
            let suggestions_total = state
                .with_repo(|repo| repo.count_suggestions(&session_id))
                .unwrap_or(0);
            let dto = guidance_update_from(result.suggestion, suggestions_total);
            let _ = state.with_repo(|repo| {
                perf.finish(repo);
                Ok(())
            });
            Ok(CommandResponse::success(dto))
        }
        Err(e) => Ok(CommandResponse::failure("vision_error", e)),
    }
}

#[tauri::command]
pub async fn request_contextual_guidance(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<GuidanceUpdateDto>, ()> {
    let perf = PerfSpan::start(PerformanceMetric::Guidance, Some(&session_id));
    match GuidanceService::generate_contextual_for_session(&state, &session_id, Some(&app)).await
    {
        Ok(suggestion) => {
            let suggestions_total = state
                .with_repo(|repo| repo.count_suggestions(&session_id))
                .unwrap_or(0);
            let dto = guidance_update_from(suggestion, suggestions_total);
            let _ = state.with_repo(|repo| {
                perf.finish(repo);
                Ok(())
            });
            Ok(CommandResponse::success(dto))
        }
        Err(e) => Ok(CommandResponse::failure("guidance_error", e)),
    }
}

#[tauri::command]
pub async fn request_guidance(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<GuidanceUpdateDto>, ()> {
    let perf = PerfSpan::start(PerformanceMetric::Guidance, Some(&session_id));
    match GuidanceService::generate_for_session(&state, &session_id, Some(&app)).await {
        Ok(Some(suggestion)) => {
            let suggestions_total = state
                .with_repo(|repo| repo.count_suggestions(&session_id))
                .unwrap_or(0);
            let dto = guidance_update_from(suggestion, suggestions_total);
            let _ = state.with_repo(|repo| {
                perf.finish(repo);
                Ok(())
            });
            Ok(CommandResponse::success(dto))
        }
        Ok(None) => Ok(CommandResponse::failure(
            "guidance_busy",
            "orientação já em andamento; aguarde o trecho anterior",
        )),
        Err(e) => Ok(CommandResponse::failure("guidance_error", e)),
    }
}

#[tauri::command]
pub async fn copy_suggestion(
    state: State<'_, AppState>,
    session_id: String,
    suggestion_id: String,
) -> Result<CommandResponse<()>, ()> {
    match state.with_repo_str(|repo| SuggestionActions::copy(repo, &session_id, &suggestion_id)) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure("suggestion_error", e)),
    }
}

#[tauri::command]
pub async fn save_suggestion(
    state: State<'_, AppState>,
    session_id: String,
    suggestion_id: String,
) -> Result<CommandResponse<()>, ()> {
    match state.with_repo_str(|repo| SuggestionActions::save(repo, &session_id, &suggestion_id)) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure("suggestion_error", e)),
    }
}

#[tauri::command]
pub async fn get_live_session_state(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<LiveSessionStateDto>, ()> {
    match build_live_state(&state, &session_id) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("state_error", e)),
    }
}
