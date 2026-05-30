use tauri::State;

use crate::commands::session_dto::{build_live_state, LiveSessionStateDto};
use crate::commands::CommandResponse;
use crate::sessions::translation::TranslationService;
use crate::storage::AppState;

#[tauri::command]
pub fn set_session_target_language(
    state: State<'_, AppState>,
    session_id: String,
    target_language: String,
) -> Result<CommandResponse<LiveSessionStateDto>, ()> {
    match state.with_repo_str(|repo| {
        TranslationService::set_target_language(repo, &session_id, &target_language)
    }) {
        Ok(()) => match build_live_state(&state, &session_id) {
            Ok(dto) => Ok(CommandResponse::success(dto)),
            Err(e) => Ok(CommandResponse::failure("state_error", e)),
        },
        Err(e) => Ok(CommandResponse::failure("translation_error", e)),
    }
}

#[tauri::command]
pub async fn translate_transcript_segment(
    state: State<'_, AppState>,
    session_id: String,
    transcript_segment_id: String,
) -> Result<CommandResponse<LiveSessionStateDto>, ()> {
    let prepared = match state.with_repo_str(|repo| {
        TranslationService::prepare_translation(&state, repo, &session_id, &transcript_segment_id)
    }) {
        Ok(r) => r,
        Err(e) => return Ok(CommandResponse::failure("translation_error", e)),
    };

    let response = match TranslationService::fetch_translation(&prepared).await {
        Ok(r) => r,
        Err(e) => return Ok(CommandResponse::failure("translation_error", e)),
    };

    match state.with_repo_str(|repo| {
        TranslationService::persist_translation(
            repo,
            &session_id,
            &transcript_segment_id,
            &prepared,
            response,
        )
    }) {
        Ok(_) => match build_live_state(&state, &session_id) {
            Ok(dto) => Ok(CommandResponse::success(dto)),
            Err(e) => Ok(CommandResponse::failure("state_error", e)),
        },
        Err(e) => Ok(CommandResponse::failure("translation_error", e)),
    }
}
