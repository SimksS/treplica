pub mod send_transcript;

pub fn register_all(app: &tauri::AppHandle) -> Result<(), String> {
    if let Err(e) = crate::stealth::window::register_stealth_shortcut(app) {
        eprintln!("[shortcuts] stealth shortcut unavailable: {e}");
    }
    if let Err(e) = send_transcript::register_send_transcript_shortcut(app) {
        eprintln!("[shortcuts] send-transcript shortcut unavailable: {e}");
    }
    Ok(())
}
