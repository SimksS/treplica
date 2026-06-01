use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Position, Size, WebviewWindow};

use crate::commands::session_commands::active_session_requires_leave_prompt;
use crate::storage::AppState;

use super::capture_exclusion::{
    set_exclusion, state_label, CaptureExclusionResult, CaptureExclusionState,
};

pub const STEALTH_WINDOW_LABEL: &str = "stealth";
const OVERLAY_WIDTH: f64 = 400.0;
const OVERLAY_HEIGHT_RATIO: f64 = 0.86;
const OVERLAY_MARGIN: f64 = 12.0;

#[derive(Debug, Clone, Serialize, Default)]
pub struct StealthStatus {
    pub overlay_visible: bool,
    pub always_on_top: bool,
    /// `active` | `unsupported` | `failed` — invisível em captura quando `active`.
    pub capture_exclusion: String,
    pub capture_exclusion_detail: String,
    pub platform: String,
    pub hotkey: String,
    /// User preference: hide overlay from screen capture when true.
    pub capture_hidden_in_recording: bool,
}

pub struct StealthState {
    pub status: Mutex<StealthStatus>,
    pub capture_exclusion_enabled: Mutex<bool>,
    /// While true, capture exclusion stays off so the overlay stays usable during getDisplayMedia.
    pub system_audio_capture_active: Mutex<bool>,
}

impl StealthState {
    pub fn new(hotkey: String) -> Self {
        Self {
            status: Mutex::new(StealthStatus {
                overlay_visible: false,
                always_on_top: true,
                capture_exclusion: "unknown".into(),
                capture_exclusion_detail: "Inicializando…".into(),
                platform: super::capture_exclusion::platform_label().into(),
                hotkey,
                capture_hidden_in_recording: true,
            }),
            capture_exclusion_enabled: Mutex::new(true),
            system_audio_capture_active: Mutex::new(false),
        }
    }
}

pub struct StealthService;

impl StealthService {
    pub fn get_status(state: &StealthState) -> Result<StealthStatus, String> {
        let guard = state.status.lock().map_err(|e| e.to_string())?;
        Ok(guard.clone())
    }

    fn apply_exclusion_to_status(
        guard: &mut StealthStatus,
        result: CaptureExclusionResult,
        user_enabled: bool,
        system_audio_active: bool,
    ) {
        guard.capture_hidden_in_recording = user_enabled;
        if system_audio_active && user_enabled {
            guard.capture_exclusion = "disabled".into();
            guard.capture_exclusion_detail = "Exclusão pausada durante captura de áudio do PC — o overlay permanece visível e legível.".into();
            return;
        }
        if !user_enabled {
            guard.capture_exclusion = "disabled".into();
            guard.capture_exclusion_detail =
                "Overlay visível em compartilhamento de tela e gravações.".into();
            return;
        }
        guard.capture_exclusion = state_label(result.state).into();
        guard.capture_exclusion_detail = result.detail;
        guard.platform = result.platform;
    }

    fn sync_capture_exclusion(
        app: &AppHandle,
        state: &StealthState,
    ) -> Result<StealthStatus, String> {
        let window = stealth_window(app)?;
        let user_enabled = state
            .capture_exclusion_enabled
            .lock()
            .map_err(|e| e.to_string())?
            .clone();
        let system_audio_active = state
            .system_audio_capture_active
            .lock()
            .map_err(|e| e.to_string())?
            .clone();
        let apply_exclusion = user_enabled && !system_audio_active;
        let result = set_exclusion(&window, apply_exclusion);
        let mut guard = state.status.lock().map_err(|e| e.to_string())?;
        Self::apply_exclusion_to_status(
            &mut guard,
            result,
            user_enabled,
            system_audio_active,
        );
        Ok(guard.clone())
    }

    pub fn set_system_audio_capture_active(
        app: &AppHandle,
        state: &StealthState,
        active: bool,
    ) -> Result<StealthStatus, String> {
        {
            let mut flag = state
                .system_audio_capture_active
                .lock()
                .map_err(|e| e.to_string())?;
            *flag = active;
        }
        Self::sync_capture_exclusion(app, state)
    }

    pub fn toggle_capture_exclusion(
        app: &AppHandle,
        state: &StealthState,
    ) -> Result<StealthStatus, String> {
        {
            let mut enabled = state
                .capture_exclusion_enabled
                .lock()
                .map_err(|e| e.to_string())?;
            *enabled = !*enabled;
        }
        Self::sync_capture_exclusion(app, state)
    }

    /// Call once at startup and whenever the stealth window is shown.
    pub fn configure_stealth_window(
        app: &AppHandle,
        state: &StealthState,
    ) -> Result<StealthStatus, String> {
        let _ = layout_stealth_window(&stealth_window(app)?);
        Self::sync_capture_exclusion(app, state)
    }

    pub fn toggle_overlay(app: &AppHandle, state: &StealthState) -> Result<StealthStatus, String> {
        let window = stealth_window(app)?;
        let visible = window.is_visible().map_err(|e| e.to_string())?;
        if visible {
            if let Some(app_state) = app.try_state::<AppState>() {
                if active_session_requires_leave_prompt(&app_state).unwrap_or(false) {
                    let _ = app.emit_to(STEALTH_WINDOW_LABEL, "overlay-hide-requested", ());
                    let guard = state.status.lock().map_err(|e| e.to_string())?;
                    return Ok(guard.clone());
                }
            }
            window.hide().map_err(|e| e.to_string())?;
        } else {
            return show_and_layout_stealth(app, state);
        }
        let mut guard = state.status.lock().map_err(|e| e.to_string())?;
        guard.overlay_visible = false;
        Ok(guard.clone())
    }

    pub fn show_overlay(app: &AppHandle, state: &StealthState) -> Result<StealthStatus, String> {
        show_and_layout_stealth(app, state)
    }

    pub fn hide_overlay(app: &AppHandle, state: &StealthState) -> Result<StealthStatus, String> {
        if let Ok(window) = stealth_window(app) {
            window.hide().map_err(|e| e.to_string())?;
        }
        let mut guard = state.status.lock().map_err(|e| e.to_string())?;
        guard.overlay_visible = false;
        Ok(guard.clone())
    }

    pub fn set_always_on_top(
        app: &AppHandle,
        state: &StealthState,
        enabled: bool,
    ) -> Result<StealthStatus, String> {
        if let Ok(window) = stealth_window(app) {
            window
                .set_always_on_top(enabled)
                .map_err(|e| e.to_string())?;
        }
        let mut guard = state.status.lock().map_err(|e| e.to_string())?;
        guard.always_on_top = enabled;
        Ok(guard.clone())
    }

    pub fn is_capture_exclusion_active(state: &StealthState) -> bool {
        state
            .status
            .lock()
            .ok()
            .map(|g| g.capture_exclusion == state_label(CaptureExclusionState::Active))
            .unwrap_or(false)
    }
}

fn stealth_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(STEALTH_WINDOW_LABEL)
        .ok_or_else(|| "stealth window not configured".to_string())
}

/// Sizes the overlay to ~86% of the monitor height (readable transcript area).
pub fn layout_stealth_window(window: &WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "monitor indisponível".to_string())?;
    let scale = monitor.scale_factor();
    let screen = monitor.size();
    let screen_w = screen.width as f64 / scale;
    let screen_h = screen.height as f64 / scale;
    let height = (screen_h * OVERLAY_HEIGHT_RATIO).max(320.0);
    let width = OVERLAY_WIDTH.min(screen_w - OVERLAY_MARGIN * 2.0);
    let x = screen_w - width - OVERLAY_MARGIN;
    let y = OVERLAY_MARGIN;
    window
        .set_size(Size::Logical(LogicalSize { width, height }))
        .map_err(|e| e.to_string())?;
    window
        .set_position(Position::Logical(LogicalPosition { x, y }))
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn show_and_layout_stealth(app: &AppHandle, state: &StealthState) -> Result<StealthStatus, String> {
    let window = stealth_window(app)?;
    layout_stealth_window(&window)?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().ok();
    let mut status = StealthService::sync_capture_exclusion(app, state)?;
    status.overlay_visible = true;
    if let Ok(mut guard) = state.status.lock() {
        guard.overlay_visible = true;
        *guard = status.clone();
    }
    Ok(status)
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window not configured".to_string())
}

#[tauri::command]
pub fn focus_main_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_overlay_capture_exclusion(
    app: AppHandle,
    stealth: tauri::State<'_, StealthState>,
) -> Result<StealthStatus, String> {
    StealthService::toggle_capture_exclusion(&app, &stealth)
}

#[tauri::command]
pub fn set_overlay_system_audio_capture_active(
    app: AppHandle,
    stealth: tauri::State<'_, StealthState>,
    active: bool,
) -> Result<StealthStatus, String> {
    StealthService::set_system_audio_capture_active(&app, &stealth, active)
}

#[tauri::command]
pub fn get_overlay_session_snapshot(
    state: tauri::State<'_, AppState>,
) -> Result<crate::commands::session_dto::OverlaySessionSnapshotDto, String> {
    crate::commands::session_dto::build_overlay_snapshot(&state)
}

#[tauri::command]
pub fn list_capture_monitors() -> Result<Vec<super::screen_capture::CaptureMonitorDto>, String> {
    super::screen_capture::list_monitors()
}

#[tauri::command]
pub fn get_snapshot_monitor(
    state: tauri::State<'_, AppState>,
    session_id: Option<String>,
) -> Result<Option<u32>, String> {
    let sid = session_id
        .filter(|s| !s.is_empty())
        .or_else(|| state.active_session_id());
    Ok(state.get_snapshot_monitor_id(sid.as_deref()))
}

#[tauri::command]
pub fn set_snapshot_monitor(
    state: tauri::State<'_, AppState>,
    monitor_id: u32,
    session_id: Option<String>,
) -> Result<(), String> {
    let sid = session_id
        .filter(|s| !s.is_empty())
        .or_else(|| state.active_session_id());
    state.set_snapshot_monitor_id(sid.as_deref(), monitor_id)
}

#[tauri::command]
pub fn capture_screen_snapshot(
    state: tauri::State<'_, AppState>,
    monitor_id: Option<u32>,
    session_id: Option<String>,
) -> Result<String, String> {
    let sid = session_id
        .filter(|s| !s.is_empty())
        .or_else(|| state.active_session_id());
    let id = state.resolve_snapshot_monitor_id(sid.as_deref(), monitor_id)?;
    super::screen_capture::capture_monitor_data_url(id)
}

#[tauri::command]
pub async fn overlay_analyze_image(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    image_data_url: Option<String>,
    source: Option<String>,
) -> Result<crate::commands::session_dto::GuidanceUpdateDto, String> {
    let session_id = state
        .active_session_id()
        .ok_or_else(|| "nenhuma sessão ao vivo ativa".to_string())?;
    let url = match image_data_url.filter(|u| !u.trim().is_empty()) {
        Some(u) => u,
        None => {
            let id = state.resolve_snapshot_monitor_id(Some(&session_id), None)?;
            super::screen_capture::capture_monitor_data_url(id)?
        }
    };
    let src = source.unwrap_or_else(|| "screenshot".into());
    let result = crate::sessions::vision::VisionService::analyze_for_session(
        &state,
        &session_id,
        &url,
        &src,
        Some(&app),
    )
    .await?;
    let suggestions_total = state
        .with_repo(|repo| repo.count_suggestions(&session_id))
        .unwrap_or(0);
    Ok(crate::commands::session_dto::guidance_update_from(
        result.suggestion,
        suggestions_total,
    ))
}

#[tauri::command]
pub async fn overlay_request_guidance(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<crate::commands::session_dto::GuidanceUpdateDto, String> {
    let session_id = state
        .active_session_id()
        .ok_or_else(|| "nenhuma sessão ao vivo ativa".to_string())?;
    let suggestion =
        crate::sessions::guidance::GuidanceService::generate_contextual_for_session(
            &state,
            &session_id,
            Some(&app),
        )
        .await?;
    let suggestions_total = state
        .with_repo(|repo| repo.count_suggestions(&session_id))
        .unwrap_or(0);
    Ok(crate::commands::session_dto::guidance_update_from(
        suggestion,
        suggestions_total,
    ))
}

pub fn register_stealth_shortcut(app: &AppHandle) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

    let hotkey = app
        .try_state::<AppState>()
        .ok_or_else(|| "AppState not ready".to_string())?
        .app_settings
        .get()?
        .stealth_hotkey;
    let shortcut: Shortcut = hotkey.parse().map_err(|e| format!("invalid hotkey: {e}"))?;

    // Unregister first to handle same-process double-registration (e.g. hot-reload).
    let _ = app.global_shortcut().unregister(shortcut);

    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Some(stealth) = app_handle.try_state::<StealthState>() {
                    let _ = StealthService::toggle_overlay(&app_handle, &stealth);
                }
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}
