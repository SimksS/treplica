use serde::Serialize;
use tauri::WebviewWindow;

/// Whether the overlay is hidden from screen capture / screenshots (OS-dependent).
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CaptureExclusionState {
    /// WDA_EXCLUDEFROMCAPTURE (Windows 10 2004+) or macOS sharing none.
    Active,
    /// Linux and other platforms without API support.
    Unsupported,
    /// API exists but the call failed.
    Failed,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaptureExclusionResult {
    pub state: CaptureExclusionState,
    pub detail: String,
    pub platform: String,
}

pub fn platform_label() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

/// Applies or clears OS-level capture exclusion on the overlay window.
pub fn set_exclusion(window: &WebviewWindow, enabled: bool) -> CaptureExclusionResult {
    if !enabled {
        #[cfg(any(target_os = "windows", target_os = "macos"))]
        {
            let _ = window.set_content_protected(false);
            #[cfg(target_os = "windows")]
            {
                // WebView2 may keep a black surface until the window is shown again.
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        return CaptureExclusionResult {
            state: CaptureExclusionState::Unsupported,
            detail: "Overlay visível em compartilhamento de tela e gravações.".into(),
            platform: platform_label().into(),
        };
    }
    apply_protected(window)
}

/// Applies OS-level capture exclusion so the window is visible on the monitor but
/// omitted from screen sharing, Win+Shift+S, OBS, Teams/Zoom capture, etc.
pub fn apply(window: &WebviewWindow) -> CaptureExclusionResult {
    set_exclusion(window, true)
}

fn apply_protected(window: &WebviewWindow) -> CaptureExclusionResult {
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        match window.set_content_protected(true) {
            Ok(()) => CaptureExclusionResult {
                state: CaptureExclusionState::Active,
                detail: active_detail(),
                platform: platform_label().into(),
            },
            Err(e) => CaptureExclusionResult {
                state: CaptureExclusionState::Failed,
                detail: format!(
                    "Não foi possível ativar exclusão de captura: {e}. Verifique se o DWM está ativo (Windows) ou reinicie o app."
                ),
                platform: platform_label().into(),
            },
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = window;
        CaptureExclusionResult {
            state: CaptureExclusionState::Unsupported,
            detail: "Exclusão de captura não é suportada neste sistema. O overlay pode aparecer em compartilhamento de tela.".into(),
            platform: platform_label().into(),
        }
    }
}

fn active_detail() -> String {
    if cfg!(target_os = "windows") {
        "Ativo: o overlay não aparece em prints (Win+Shift+S), Gravação de Tela, Teams, Zoom, OBS e similares. Você ainda o vê no monitor.".into()
    } else if cfg!(target_os = "macos") {
        "Ativo: o overlay não deve aparecer na maioria dos compartilhamentos de tela do macOS. Você ainda o vê no monitor.".into()
    } else {
        "Ativo.".into()
    }
}

pub fn state_label(state: CaptureExclusionState) -> &'static str {
    match state {
        CaptureExclusionState::Active => "active",
        CaptureExclusionState::Unsupported => "unsupported",
        CaptureExclusionState::Failed => "failed",
    }
}
