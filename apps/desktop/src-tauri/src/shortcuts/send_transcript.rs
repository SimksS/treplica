use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::storage::AppState;

pub const SEND_TRANSCRIPT_EVENT: &str = "send-transcript-hotkey";

pub fn register_send_transcript_shortcut(app: &AppHandle) -> Result<(), String> {
    let hotkey = app
        .try_state::<AppState>()
        .ok_or_else(|| "AppState not ready".to_string())?
        .app_settings
        .get()?
        .send_transcript_hotkey;

    let shortcut: Shortcut = hotkey.parse().map_err(|e| format!("invalid send hotkey: {e}"))?;

    // Unregister first to handle same-process double-registration (e.g. hot-reload).
    let _ = app.global_shortcut().unregister(shortcut);

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = app_handle.emit(SEND_TRANSCRIPT_EVENT, ());
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}
