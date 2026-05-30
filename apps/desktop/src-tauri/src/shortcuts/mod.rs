pub mod send_transcript;

pub fn register_all(app: &tauri::AppHandle) -> Result<(), String> {
    crate::stealth::window::register_stealth_shortcut(app)?;
    send_transcript::register_send_transcript_shortcut(app)?;
    Ok(())
}
