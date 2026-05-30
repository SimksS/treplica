use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::commands::session_dto::tick_update_from_result;
use crate::sessions::live_pipeline::{ingest_simulated_tick, LIVE_TRANSCRIPT_INTERVAL_SECS};
use crate::storage::AppState;

pub struct LiveListenerControl {
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    demo_mode: Arc<AtomicBool>,
}

pub struct LiveListenerRegistry {
    tasks: Mutex<HashMap<String, LiveListenerControl>>,
}

impl LiveListenerRegistry {
    pub fn new() -> Self {
        Self {
            tasks: Mutex::new(HashMap::new()),
        }
    }

    pub fn set_demo_mode(&self, session_id: &str, enabled: bool) {
        if let Ok(tasks) = self.tasks.lock() {
            if let Some(ctrl) = tasks.get(session_id) {
                ctrl.demo_mode.store(enabled, Ordering::Relaxed);
            }
        }
    }

    pub fn start(&self, app: &AppHandle, session_id: &str) {
        self.stop(session_id);
        let stop = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));
        let demo_mode = Arc::new(AtomicBool::new(false));
        let stop_flag = stop.clone();
        let paused_flag = paused.clone();
        let demo_flag = demo_mode.clone();
        let sid = session_id.to_string();
        let app_handle = app.clone();

        tauri::async_runtime::spawn(async move {
            let mut interval =
                tokio::time::interval(Duration::from_secs(LIVE_TRANSCRIPT_INTERVAL_SECS));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                interval.tick().await;
                if stop_flag.load(Ordering::Relaxed) {
                    break;
                }
                if paused_flag.load(Ordering::Relaxed) {
                    continue;
                }
                if !demo_flag.load(Ordering::Relaxed) {
                    continue;
                }
                let state = app_handle.state::<AppState>();
                match ingest_simulated_tick(&state, &sid, Some(&app_handle)).await {
                    Ok(result) => {
                        let update = tick_update_from_result(result);
                        let _ = app_handle.emit("live-transcript-tick", update);
                    }
                    Err(e) => {
                        let _ = app_handle.emit(
                            "live-pipeline-error",
                            serde_json::json!({ "session_id": sid, "message": e }),
                        );
                    }
                }
            }
        });

        if let Ok(mut tasks) = self.tasks.lock() {
            tasks.insert(
                session_id.to_string(),
                LiveListenerControl {
                    stop,
                    paused,
                    demo_mode,
                },
            );
        }
    }

    pub fn pause(&self, session_id: &str) {
        if let Ok(tasks) = self.tasks.lock() {
            if let Some(ctrl) = tasks.get(session_id) {
                ctrl.paused.store(true, Ordering::Relaxed);
            }
        }
    }

    pub fn resume(&self, session_id: &str) {
        if let Ok(tasks) = self.tasks.lock() {
            if let Some(ctrl) = tasks.get(session_id) {
                ctrl.paused.store(false, Ordering::Relaxed);
            }
        }
    }

    pub fn stop(&self, session_id: &str) {
        if let Ok(mut tasks) = self.tasks.lock() {
            if let Some(ctrl) = tasks.remove(session_id) {
                ctrl.stop.store(true, Ordering::Relaxed);
            }
        }
    }
}
