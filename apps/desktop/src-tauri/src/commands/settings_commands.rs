use local_store::models::PrivacyMode;
use local_store::provider_repository::{parse_privacy_mode, ProviderRepository};
use serde::Deserialize;
use tauri::{AppHandle, State};

use crate::commands::CommandResponse;
use crate::stealth::window::{StealthService, StealthState};
use crate::storage::AppState;

#[derive(Debug, serde::Serialize)]
pub struct PrivacySettingsDto {
    pub privacy_mode: String,
    pub hosted_warning_acknowledged: bool,
    pub requires_hosted_warning: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePrivacyInput {
    pub privacy_mode: String,
}

#[tauri::command]
pub fn get_privacy_settings(
    state: State<'_, AppState>,
) -> Result<CommandResponse<PrivacySettingsDto>, ()> {
    let profile =
        match state.with_repo(|repo| ProviderRepository::new(repo.conn()).get_default_profile()) {
            Ok(p) => p,
            Err(e) => return Ok(CommandResponse::failure("settings_error", e)),
        };
    let app = match state.app_settings.get() {
        Ok(a) => a,
        Err(e) => return Ok(CommandResponse::failure("settings_error", e)),
    };
    let mode = profile.privacy_mode;
    Ok(CommandResponse::success(PrivacySettingsDto {
        privacy_mode: privacy_mode_to_string(mode),
        hosted_warning_acknowledged: app.hosted_warning_acknowledged,
        requires_hosted_warning: !app.hosted_warning_acknowledged && mode != PrivacyMode::LocalOnly,
    }))
}

#[tauri::command]
pub fn update_privacy_settings(
    state: State<'_, AppState>,
    input: UpdatePrivacyInput,
) -> Result<CommandResponse<PrivacySettingsDto>, ()> {
    let mode = parse_privacy_mode(input.privacy_mode);
    if mode != PrivacyMode::LocalOnly {
        let app = match state.app_settings.get() {
            Ok(a) => a,
            Err(e) => return Ok(CommandResponse::failure("settings_error", e)),
        };
        if !app.hosted_warning_acknowledged {
            return Ok(CommandResponse::failure(
                "privacy_warning_required",
                "Acknowledge hosted provider warning before enabling cloud mode",
            ));
        }
    }
    let profile = match state
        .with_repo(|repo| ProviderRepository::new(repo.conn()).update_privacy_mode(mode))
    {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("settings_error", e)),
    };
    let app = match state.app_settings.get() {
        Ok(a) => a,
        Err(e) => return Ok(CommandResponse::failure("settings_error", e)),
    };
    Ok(CommandResponse::success(PrivacySettingsDto {
        privacy_mode: privacy_mode_to_string(profile.privacy_mode),
        hosted_warning_acknowledged: app.hosted_warning_acknowledged,
        requires_hosted_warning: false,
    }))
}

#[tauri::command]
pub fn acknowledge_hosted_provider_warning(
    state: State<'_, AppState>,
) -> Result<CommandResponse<PrivacySettingsDto>, ()> {
    if let Err(e) = state.app_settings.set_hosted_warning_acknowledged(true) {
        return Ok(CommandResponse::failure("settings_error", e));
    }
    get_privacy_settings(state)
}

#[tauri::command]
pub fn get_stealth_status(
    stealth: State<'_, StealthState>,
) -> Result<CommandResponse<crate::stealth::window::StealthStatus>, ()> {
    match StealthService::get_status(&stealth) {
        Ok(s) => Ok(CommandResponse::success(s)),
        Err(e) => Ok(CommandResponse::failure("stealth_error", e)),
    }
}

#[tauri::command]
pub fn toggle_stealth_overlay(
    app: AppHandle,
    stealth: State<'_, StealthState>,
) -> Result<CommandResponse<crate::stealth::window::StealthStatus>, ()> {
    match StealthService::toggle_overlay(&app, &stealth) {
        Ok(s) => Ok(CommandResponse::success(s)),
        Err(e) => Ok(CommandResponse::failure("stealth_error", e)),
    }
}

#[tauri::command]
pub fn show_stealth_overlay(
    app: AppHandle,
    stealth: State<'_, StealthState>,
) -> Result<CommandResponse<crate::stealth::window::StealthStatus>, ()> {
    match StealthService::show_overlay(&app, &stealth) {
        Ok(s) => Ok(CommandResponse::success(s)),
        Err(e) => Ok(CommandResponse::failure("stealth_error", e)),
    }
}

#[tauri::command]
pub fn hide_stealth_overlay(
    app: AppHandle,
    stealth: State<'_, StealthState>,
) -> Result<CommandResponse<crate::stealth::window::StealthStatus>, ()> {
    match StealthService::hide_overlay(&app, &stealth) {
        Ok(s) => Ok(CommandResponse::success(s)),
        Err(e) => Ok(CommandResponse::failure("stealth_error", e)),
    }
}

#[tauri::command]
pub fn set_stealth_always_on_top(
    app: AppHandle,
    stealth: State<'_, StealthState>,
    enabled: bool,
) -> Result<CommandResponse<crate::stealth::window::StealthStatus>, ()> {
    match StealthService::set_always_on_top(&app, &stealth, enabled) {
        Ok(s) => Ok(CommandResponse::success(s)),
        Err(e) => Ok(CommandResponse::failure("stealth_error", e)),
    }
}

#[derive(Debug, serde::Serialize)]
pub struct AccessibilitySettingsDto {
    pub font_scale: f32,
    pub overlay_font_scale: f32,
    pub reduce_motion: bool,
    pub high_contrast: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccessibilityInput {
    pub font_scale: f32,
    pub overlay_font_scale: f32,
    pub reduce_motion: bool,
    pub high_contrast: bool,
}

#[tauri::command]
pub fn get_accessibility_settings(
    state: State<'_, AppState>,
) -> Result<CommandResponse<AccessibilitySettingsDto>, ()> {
    match state.app_settings.get() {
        Ok(s) => Ok(CommandResponse::success(AccessibilitySettingsDto {
            font_scale: s.accessibility.font_scale,
            overlay_font_scale: s.accessibility.overlay_font_scale,
            reduce_motion: s.accessibility.reduce_motion,
            high_contrast: s.accessibility.high_contrast,
        })),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

#[tauri::command]
pub fn update_accessibility_settings(
    state: State<'_, AppState>,
    input: UpdateAccessibilityInput,
) -> Result<CommandResponse<AccessibilitySettingsDto>, ()> {
    match state.app_settings.update(|s| {
        s.accessibility.font_scale = input.font_scale.clamp(0.75, 1.5);
        s.accessibility.overlay_font_scale = input.overlay_font_scale.clamp(0.75, 1.5);
        s.accessibility.reduce_motion = input.reduce_motion;
        s.accessibility.high_contrast = input.high_contrast;
    }) {
        Ok(s) => Ok(CommandResponse::success(AccessibilitySettingsDto {
            font_scale: s.accessibility.font_scale,
            overlay_font_scale: s.accessibility.overlay_font_scale,
            reduce_motion: s.accessibility.reduce_motion,
            high_contrast: s.accessibility.high_contrast,
        })),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

/// Whether this platform offers native on-device speech recognition
/// (SFSpeechRecognizer). True only on macOS with the framework available.
#[tauri::command]
pub fn native_speech_supported() -> bool {
    #[cfg(target_os = "macos")]
    {
        crate::audio::macos_speech::native_speech_supported()
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// Current value of the macOS native-speech opt-in setting.
#[tauri::command]
pub fn get_macos_native_speech(state: State<'_, AppState>) -> Result<CommandResponse<bool>, ()> {
    match state.app_settings.get() {
        Ok(s) => Ok(CommandResponse::success(s.macos_native_speech)),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

/// Enable/disable native macOS speech recognition (opt-in fallback). Takes
/// effect on the next transcribed chunk; no capture restart needed.
#[tauri::command]
pub fn set_macos_native_speech(
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<CommandResponse<bool>, ()> {
    match state.app_settings.update(|s| s.macos_native_speech = enabled) {
        Ok(s) => Ok(CommandResponse::success(s.macos_native_speech)),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

fn privacy_mode_to_string(mode: PrivacyMode) -> String {
    match mode {
        PrivacyMode::LocalOnly => "local_only".into(),
        PrivacyMode::HostedPerSession => "hosted_per_session".into(),
        PrivacyMode::HostedDefault => "hosted_default".into(),
    }
}
