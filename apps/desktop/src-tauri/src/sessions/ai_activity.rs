use std::future::Future;

use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiActivityEventDto {
    pub session_id: String,
    pub purpose: String,
}

pub fn emit_started(app: &AppHandle, session_id: &str, purpose: &str) {
    let _ = app.emit(
        "ai-activity-started",
        AiActivityEventDto {
            session_id: session_id.to_string(),
            purpose: purpose.to_string(),
        },
    );
}

pub fn emit_finished(app: &AppHandle, session_id: &str, purpose: &str) {
    let _ = app.emit(
        "ai-activity-finished",
        AiActivityEventDto {
            session_id: session_id.to_string(),
            purpose: purpose.to_string(),
        },
    );
}

/// RAII guard that emits `ai-activity-finished` when dropped, ensuring the event
/// fires even if the enclosing async future is cancelled before it completes.
struct ActivityGuard {
    app: AppHandle,
    session_id: String,
    purpose: String,
}

impl Drop for ActivityGuard {
    fn drop(&mut self) {
        emit_finished(&self.app, &self.session_id, &self.purpose);
    }
}

pub async fn with_activity<F, Fut, T>(
    app: Option<&AppHandle>,
    session_id: &str,
    purpose: &str,
    f: F,
) -> T
where
    F: FnOnce() -> Fut,
    Fut: Future<Output = T>,
{
    let _guard = app.map(|handle| {
        emit_started(handle, session_id, purpose);
        ActivityGuard {
            app: handle.clone(),
            session_id: session_id.to_string(),
            purpose: purpose.to_string(),
        }
    });
    f().await
}
