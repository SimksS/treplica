use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct CommandResponse<T: Serialize> {
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<CommandError>,
}

impl<T: Serialize> CommandResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn failure(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            data: None,
            error: Some(CommandError::new(code, message)),
        }
    }
}

pub mod audio_capture_commands;
pub mod context_commands;
pub mod history_commands;
pub mod model_commands;
pub mod platform_commands;
pub mod provider_commands;
pub mod session_commands;
pub mod session_dto;
pub mod settings_commands;
pub mod setup_commands;
pub mod storage_commands;
pub mod translation_commands;
pub mod update_commands;
