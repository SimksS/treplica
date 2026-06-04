use serde::Deserialize;
use tauri::State;

use crate::commands::CommandResponse;
use crate::storage::app_settings::AppSettingsFile;
use crate::storage::AppState;

#[derive(Debug, Clone, serde::Serialize)]
pub struct OnboardingStateDto {
    pub completed: bool,
    pub microphone_permission_granted: bool,
    pub screen_permission_granted: bool,
    pub transcription_language_mode: String,
    pub transcription_language_custom: Option<String>,
    pub send_transcript_hotkey: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOnboardingInput {
    pub microphone_permission_granted: Option<bool>,
    pub screen_permission_granted: Option<bool>,
    pub transcription_language_mode: Option<String>,
    pub transcription_language_custom: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SetupAiTestResultDto {
    pub response_text: String,
    pub latency_ms: u64,
}

fn dto_from(settings: &AppSettingsFile) -> OnboardingStateDto {
    OnboardingStateDto {
        completed: settings.onboarding_completed,
        microphone_permission_granted: settings.microphone_permission_granted,
        screen_permission_granted: settings.screen_permission_granted,
        transcription_language_mode: settings.transcription_language_mode.clone(),
        transcription_language_custom: settings.transcription_language_custom.clone(),
        send_transcript_hotkey: settings.send_transcript_hotkey.clone(),
    }
}

#[tauri::command]
pub fn get_onboarding_state(
    state: State<'_, AppState>,
) -> Result<CommandResponse<OnboardingStateDto>, ()> {
    match state.app_settings.get() {
        Ok(s) => Ok(CommandResponse::success(dto_from(&s))),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

#[tauri::command]
pub fn update_onboarding_state(
    state: State<'_, AppState>,
    input: UpdateOnboardingInput,
) -> Result<CommandResponse<OnboardingStateDto>, ()> {
    match state.app_settings.update(|s| {
        if let Some(v) = input.microphone_permission_granted {
            s.microphone_permission_granted = v;
        }
        if let Some(v) = input.screen_permission_granted {
            s.screen_permission_granted = v;
        }
        if let Some(mode) = input.transcription_language_mode {
            s.transcription_language_mode = mode;
        }
        if let Some(custom) = input.transcription_language_custom {
            s.transcription_language_custom = if custom.trim().is_empty() {
                None
            } else {
                Some(custom)
            };
        }
    }) {
        Ok(s) => Ok(CommandResponse::success(dto_from(&s))),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

#[tauri::command]
pub fn complete_onboarding(
    state: State<'_, AppState>,
) -> Result<CommandResponse<OnboardingStateDto>, ()> {
    match state.app_settings.update(|s| {
        s.onboarding_completed = true;
    }) {
        Ok(s) => Ok(CommandResponse::success(dto_from(&s))),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

#[tauri::command]
pub async fn run_setup_ai_test(
    state: State<'_, AppState>,
    transcript: String,
    language_hint: Option<String>,
) -> Result<CommandResponse<SetupAiTestResultDto>, ()> {
    let text = transcript.trim();
    if text.is_empty() {
        return Ok(CommandResponse::failure(
            "setup_test_empty",
            "Fale algo antes de enviar com o atalho",
        ));
    }

    let (resolved, privacy_mode) = match state.with_repo_str(|repo| {
        let resolved = crate::providers::router::resolve_for_task(
            &state,
            repo,
            provider_core::tasks::ModelTask::Guidance,
        )?;
        let profile = crate::providers::privacy::profile_privacy_from_repo(repo)?;
        crate::providers::privacy::ensure_hosted_request_allowed(profile, &resolved, true)?;
        let privacy_mode =
            crate::providers::privacy::resolve_request_privacy(profile, &resolved, true)?;
        Ok((resolved, privacy_mode))
    }) {
        Ok(r) => r,
        Err(e) => return Ok(CommandResponse::failure("setup_test_failed", e)),
    };

    let lang_note = language_hint
        .filter(|l| !l.trim().is_empty())
        .map(|l| format!("Idioma da fala: {l}.\n"))
        .unwrap_or_default();

    let request = provider_core::GuidanceRequest {
        session_context: provider_core::SessionContextInput {
            role: Some("Setup".into()),
            objective: Some("Validar transcrição e orientação".into()),
            system_prompt: Some(format!(
                "{lang_note}Você está no assistente de setup do Treplica. \
                 Responda de forma curta e útil ao que foi dito na transcrição."
            )),
            ..Default::default()
        },
        recent_transcript: vec![provider_core::TranscriptSnippet {
            speaker_label: Some("Você".into()),
            text: text.to_string(),
            confidence: 0.92,
        }],
        suggestion_type: None,
        privacy_mode,
        context_image_data_urls: vec![],
        conversation: vec![],
    };

    match crate::providers::adapter::request_guidance(&resolved, request).await {
        Ok(resp) => Ok(CommandResponse::success(SetupAiTestResultDto {
            response_text: resp.text,
            latency_ms: resp.latency_ms,
        })),
        Err(e) => Ok(CommandResponse::failure("setup_test_failed", e.to_string())),
    }
}
