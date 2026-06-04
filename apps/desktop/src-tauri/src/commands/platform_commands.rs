use serde::Serialize;

use crate::commands::CommandResponse;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimePlatformDto {
    /// `windows` | `macos` | `linux` | `unknown`
    pub os: String,
    pub display_name: String,
}

fn detect_os() -> (&'static str, &'static str) {
    if cfg!(target_os = "windows") {
        ("windows", "Windows")
    } else if cfg!(target_os = "macos") {
        ("macos", "macOS")
    } else if cfg!(target_os = "linux") {
        ("linux", "Linux")
    } else {
        ("unknown", "Desconhecido")
    }
}

#[tauri::command]
pub fn get_runtime_platform() -> Result<CommandResponse<RuntimePlatformDto>, ()> {
    let (os, display_name) = detect_os();
    Ok(CommandResponse::success(RuntimePlatformDto {
        os: os.into(),
        display_name: display_name.into(),
    }))
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
