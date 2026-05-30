use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::audio::native_mic_capture::{
    list_microphone_devices, native_microphone_supported as native_mic_supported,
    MicrophoneDeviceInfo,
};
use crate::audio::native_system_capture::{
    native_loopback_supported, NativeSystemAudioStatusPayload,
};
use crate::commands::CommandResponse;
use crate::storage::AppState;

#[derive(Clone, Serialize)]
struct SystemAudioBridgePayload {
    action: String,
    session_id: String,
    source_language: Option<String>,
}

#[derive(Clone, Serialize)]
struct MicrophoneBridgePayload {
    action: String,
    session_id: String,
    source_language: Option<String>,
    muted: Option<bool>,
    with_system_audio: Option<bool>,
}

pub fn stop_native_system_audio_internal(state: &AppState, owner: Option<&str>) {
    state.native_system_capture.stop();
    if let Some(owner) = owner {
        let _ = state.audio_capture.release_mode("system", owner);
    } else {
        let _ = state.audio_capture.release_mode("system", "main");
        let _ = state.audio_capture.release_mode("system", "stealth");
    }
}

#[tauri::command]
pub fn claim_audio_capture(
    state: State<'_, AppState>,
    mode: String,
    owner: String,
) -> Result<CommandResponse<()>, ()> {
    match state.audio_capture.claim(&mode, &owner) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure("audio_capture_busy", e)),
    }
}

#[tauri::command]
pub fn release_audio_capture(
    state: State<'_, AppState>,
    mode: String,
    owner: String,
) -> Result<CommandResponse<()>, ()> {
    match state.audio_capture.release_mode(&mode, &owner) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure("audio_capture_error", e)),
    }
}

#[tauri::command]
pub fn native_system_audio_supported() -> bool {
    native_loopback_supported()
}

#[tauri::command]
pub fn get_native_system_audio_status(
    state: State<'_, AppState>,
) -> NativeSystemAudioStatusPayload {
    state.native_system_capture.status()
}

#[tauri::command]
pub fn start_native_system_audio(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    source_language: Option<String>,
    owner: String,
) -> Result<CommandResponse<NativeSystemAudioStatusPayload>, ()> {
    if !native_loopback_supported() {
        return Ok(CommandResponse::failure(
            "native_system_audio_unsupported",
            "Captura nativa de áudio do sistema não disponível nesta plataforma (requer Windows ou macOS 14.6+).",
        ));
    }

    if state.native_system_capture.is_running() {
        return Ok(CommandResponse::success(state.native_system_capture.status()));
    }

    if let Err(e) = state.audio_capture.claim("system", &owner) {
        return Ok(CommandResponse::failure("audio_capture_busy", e));
    }

    match state.native_system_capture.start(
        app.clone(),
        session_id,
        source_language,
    ) {
        Ok(()) => Ok(CommandResponse::success(state.native_system_capture.status())),
        Err(e) => {
            let _ = state.audio_capture.release_mode("system", &owner);
            Ok(CommandResponse::failure("native_system_audio_error", e))
        }
    }
}

#[tauri::command]
pub fn stop_native_system_audio(
    state: State<'_, AppState>,
    owner: String,
) -> Result<CommandResponse<NativeSystemAudioStatusPayload>, ()> {
    stop_native_system_audio_internal(&state, Some(&owner));
    Ok(CommandResponse::success(state.native_system_capture.status()))
}

pub fn stop_native_microphone_internal(state: &AppState, owner: Option<&str>) {
    state.native_mic_capture.stop();
    if let Some(owner) = owner {
        let _ = state.audio_capture.release_mode("microphone", owner);
    } else {
        let _ = state.audio_capture.release_mode("microphone", "main");
        let _ = state.audio_capture.release_mode("microphone", "stealth");
    }
}

#[tauri::command]
pub fn native_microphone_supported() -> bool {
    native_mic_supported()
}

/// List the available microphone input devices for the global picker.
#[tauri::command]
pub fn list_microphones() -> Vec<MicrophoneDeviceInfo> {
    list_microphone_devices()
}

/// The currently preferred microphone device name, or `None` for the OS default.
#[tauri::command]
pub fn get_preferred_microphone(
    state: State<'_, AppState>,
) -> Result<CommandResponse<Option<String>>, ()> {
    match state.app_settings.get() {
        Ok(settings) => Ok(CommandResponse::success(settings.preferred_microphone)),
        Err(e) => Ok(CommandResponse::failure("app_settings_error", e)),
    }
}

/// Persist the preferred microphone device. Pass `None`/empty to revert to the
/// OS default. Takes effect on the next capture start.
#[tauri::command]
pub fn set_preferred_microphone(
    state: State<'_, AppState>,
    device_name: Option<String>,
) -> Result<CommandResponse<Option<String>>, ()> {
    let normalized = device_name
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    match state
        .app_settings
        .update(|s| s.preferred_microphone = normalized.clone())
    {
        Ok(settings) => Ok(CommandResponse::success(settings.preferred_microphone)),
        Err(e) => Ok(CommandResponse::failure("app_settings_error", e)),
    }
}

/// Start a short input-level test on the given device (or the saved preference
/// when `device_name` is omitted). Emits `microphone-test` level events and
/// auto-stops; it never transcribes.
#[tauri::command]
pub fn start_microphone_test(
    app: AppHandle,
    state: State<'_, AppState>,
    device_name: Option<String>,
) -> Result<CommandResponse<()>, ()> {
    if !native_mic_supported() {
        return Ok(CommandResponse::failure(
            "native_microphone_unsupported",
            "Teste de microfone não disponível nesta plataforma.",
        ));
    }

    let device = match device_name.map(|s| s.trim().to_string()) {
        Some(s) if !s.is_empty() => Some(s),
        // No explicit device: fall back to the saved preference.
        _ => state
            .app_settings
            .get()
            .ok()
            .and_then(|s| s.preferred_microphone),
    };

    match state.mic_test.start(app, device) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure("microphone_test_error", e)),
    }
}

#[tauri::command]
pub fn stop_microphone_test(state: State<'_, AppState>) {
    state.mic_test.stop();
}

#[tauri::command]
pub fn get_native_microphone_status(
    state: State<'_, AppState>,
) -> NativeSystemAudioStatusPayload {
    state.native_mic_capture.status()
}

#[tauri::command]
pub fn start_native_microphone(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    source_language: Option<String>,
    owner: String,
    muted: Option<bool>,
) -> Result<CommandResponse<NativeSystemAudioStatusPayload>, ()> {
    if !native_mic_supported() {
        return Ok(CommandResponse::failure(
            "native_microphone_unsupported",
            "Captura nativa de microfone não disponível nesta plataforma.",
        ));
    }

    if state.native_mic_capture.is_running() {
        state.native_mic_capture.set_muted(muted.unwrap_or(false));
        return Ok(CommandResponse::success(state.native_mic_capture.status()));
    }

    if let Err(e) = state.audio_capture.claim("microphone", &owner) {
        return Ok(CommandResponse::failure("audio_capture_busy", e));
    }

    let preferred_device = state
        .app_settings
        .get()
        .ok()
        .and_then(|s| s.preferred_microphone);

    match state.native_mic_capture.start(
        app.clone(),
        session_id,
        source_language,
        muted.unwrap_or(false),
        preferred_device,
    ) {
        Ok(()) => Ok(CommandResponse::success(state.native_mic_capture.status())),
        Err(e) => {
            let _ = state.audio_capture.release_mode("microphone", &owner);
            Ok(CommandResponse::failure("native_microphone_error", e))
        }
    }
}

#[tauri::command]
pub fn stop_native_microphone(
    state: State<'_, AppState>,
    owner: String,
    session_id: Option<String>,
) -> Result<CommandResponse<NativeSystemAudioStatusPayload>, ()> {
    if let Some(sid) = session_id {
        // Session-aware stop: ignore if a newer session has already claimed the mic.
        // This prevents a stale cleanup call from the old session's frontend effect
        // from killing the new session's capture when targetLanguage oscillates.
        if !state.native_mic_capture.stop_for_session(&sid) {
            return Ok(CommandResponse::success(state.native_mic_capture.status()));
        }
        let _ = state.audio_capture.release_mode("microphone", &owner);
    } else {
        stop_native_microphone_internal(&state, Some(&owner));
    }
    Ok(CommandResponse::success(state.native_mic_capture.status()))
}

#[tauri::command]
pub fn set_native_microphone_muted(state: State<'_, AppState>, muted: bool) {
    state.native_mic_capture.set_muted(muted);
}

/// Routes system-audio capture to the main webview (fallback when native loopback is unavailable).
#[tauri::command]
pub fn system_audio_bridge(
    app: AppHandle,
    action: String,
    session_id: String,
    source_language: Option<String>,
) -> Result<CommandResponse<()>, ()> {
    if action == "start" {
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.unminimize();
            let _ = main.show();
        }
    }

    let payload = SystemAudioBridgePayload {
        action: action.clone(),
        session_id: session_id.clone(),
        source_language,
    };

    match app.emit_to("main", "system-audio-bridge", payload) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure(
            "system_audio_bridge_error",
            format!("falha ao iniciar captura na janela principal: {e}"),
        )),
    }
}

/// Routes microphone capture to the main webview (preflight permissions, reliable getUserMedia).
#[tauri::command]
pub fn microphone_bridge(
    app: AppHandle,
    action: String,
    session_id: String,
    source_language: Option<String>,
    muted: Option<bool>,
    with_system_audio: Option<bool>,
) -> Result<CommandResponse<()>, ()> {
    let payload = MicrophoneBridgePayload {
        action,
        session_id,
        source_language,
        muted,
        with_system_audio,
    };

    match app.emit_to("main", "microphone-bridge", payload) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure(
            "microphone_bridge_error",
            format!("falha ao iniciar microfone na janela principal: {e}"),
        )),
    }
}
