pub mod app_settings;
pub mod audio_capture;
pub mod credentials;
pub mod deletion;

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;

use audio_core::simulated::SimulatedTranscriptSource;
use local_store::repositories::StoreRepositories;
use local_store::DatabaseError;
use rusqlite::Connection;

use crate::sessions::live_listener::LiveListenerRegistry;

use crate::audio::native_mic_capture::{MicTestController, NativeMicCaptureController};
use crate::audio::native_system_capture::NativeSystemCaptureController;
use crate::audio::stt_rate_limit::SttRateLimiter;

use self::app_settings::AppSettingsStore;
use self::audio_capture::AudioCaptureState;
use self::credentials::CredentialStore;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub data_dir: PathBuf,
    pub credentials: CredentialStore,
    pub app_settings: AppSettingsStore,
    pub simulators: Mutex<HashMap<String, SimulatedTranscriptSource>>,
    pub live_listeners: LiveListenerRegistry,
    pub active_session_id: Mutex<Option<String>>,
    /// Per live-session snapshot display (xcap monitor id).
    session_snapshot_monitor: Mutex<HashMap<String, u32>>,
    guidance_in_flight: Mutex<HashSet<String>>,
    pub audio_capture: AudioCaptureState,
    pub native_system_capture: NativeSystemCaptureController,
    pub native_mic_capture: NativeMicCaptureController,
    pub mic_test: MicTestController,
    pub stt_rate_limit_mic: SttRateLimiter,
    pub stt_rate_limit_system: SttRateLimiter,
}

impl AppState {
    pub fn new(conn: Connection, data_dir: PathBuf) -> Self {
        let app_settings = AppSettingsStore::load(&data_dir);
        let credentials = CredentialStore::new("treplica-desktop", &data_dir);
        Self {
            db: Mutex::new(conn),
            data_dir,
            credentials,
            app_settings,
            simulators: Mutex::new(HashMap::new()),
            live_listeners: LiveListenerRegistry::new(),
            active_session_id: Mutex::new(None),
            session_snapshot_monitor: Mutex::new(HashMap::new()),
            guidance_in_flight: Mutex::new(HashSet::new()),
            audio_capture: AudioCaptureState::new(),
            native_system_capture: NativeSystemCaptureController::new(),
            native_mic_capture: NativeMicCaptureController::new(),
            mic_test: MicTestController::new(),
            stt_rate_limit_mic: SttRateLimiter::default(),
            stt_rate_limit_system: SttRateLimiter::default(),
        }
    }

    pub fn try_begin_guidance(&self, session_id: &str) -> bool {
        let Ok(mut guard) = self.guidance_in_flight.lock() else {
            return false;
        };
        if guard.contains(session_id) {
            return false;
        }
        guard.insert(session_id.to_string());
        true
    }

    pub fn end_guidance(&self, session_id: &str) {
        if let Ok(mut guard) = self.guidance_in_flight.lock() {
            guard.remove(session_id);
        }
    }

    pub fn set_active_session(&self, session_id: Option<String>) {
        if let Ok(mut guard) = self.active_session_id.lock() {
            *guard = session_id;
        }
    }

    pub fn active_session_id(&self) -> Option<String> {
        self.active_session_id.lock().ok().and_then(|g| g.clone())
    }

    pub fn get_snapshot_monitor_id(&self, session_id: Option<&str>) -> Option<u32> {
        if let Some(sid) = session_id {
            if let Ok(guard) = self.session_snapshot_monitor.lock() {
                if let Some(&id) = guard.get(sid) {
                    return Some(id);
                }
            }
        }
        self.app_settings
            .get()
            .ok()
            .and_then(|s| s.default_snapshot_monitor_id)
    }

    pub fn set_snapshot_monitor_id(
        &self,
        session_id: Option<&str>,
        monitor_id: u32,
    ) -> Result<(), String> {
        if let Some(sid) = session_id {
            if let Ok(mut guard) = self.session_snapshot_monitor.lock() {
                guard.insert(sid.to_string(), monitor_id);
            }
        }
        self.app_settings.update(|s| {
            s.default_snapshot_monitor_id = Some(monitor_id);
        })?;
        Ok(())
    }

    pub fn resolve_snapshot_monitor_id(
        &self,
        session_id: Option<&str>,
        override_id: Option<u32>,
    ) -> Result<u32, String> {
        if let Some(id) = override_id {
            return Ok(id);
        }
        if let Some(id) = self.get_snapshot_monitor_id(session_id) {
            return Ok(id);
        }
        crate::stealth::screen_capture::default_primary_monitor_id()
    }

    pub fn is_guidance_in_flight(&self, session_id: &str) -> bool {
        self.guidance_in_flight
            .lock()
            .ok()
            .map(|g| g.contains(session_id))
            .unwrap_or(false)
    }

    pub fn with_repo<T, F>(&self, f: F) -> Result<T, String>
    where
        F: FnOnce(&StoreRepositories<'_>) -> Result<T, DatabaseError>,
    {
        let guard = self.db.lock().map_err(|e| e.to_string())?;
        let repo = StoreRepositories::new(&guard);
        f(&repo).map_err(|e| e.to_string())
    }

    pub fn with_repo_str<T, F>(&self, f: F) -> Result<T, String>
    where
        F: FnOnce(&StoreRepositories<'_>) -> Result<T, String>,
    {
        let guard = self.db.lock().map_err(|e| e.to_string())?;
        let repo = StoreRepositories::new(&guard);
        f(&repo)
    }

    pub fn default_exports_root(&self) -> std::path::PathBuf {
        self.data_dir.join("exports")
    }

    pub fn exports_root(&self) -> Result<std::path::PathBuf, String> {
        let settings = self.app_settings.get()?;
        let root = if let Some(ref custom) = settings.documents_export_dir {
            let trimmed = custom.trim();
            if trimmed.is_empty() {
                self.default_exports_root()
            } else {
                std::path::PathBuf::from(trimmed)
            }
        } else {
            self.default_exports_root()
        };
        if !root.exists() {
            std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
        }
        Ok(root)
    }
}
