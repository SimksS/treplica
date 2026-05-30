use std::fs;
use std::path::Path;
use std::sync::Mutex;

use provider_core::tasks::ModelRoutingConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessibilitySettings {
    /// Global font scale: 0.875 | 1.0 | 1.125 | 1.25
    pub font_scale: f32,
    /// Overlay-specific font scale (independent of global)
    pub overlay_font_scale: f32,
    /// Suppress CSS transitions and animations
    pub reduce_motion: bool,
    /// Increase color contrast across the UI
    pub high_contrast: bool,
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            font_scale: 1.0,
            overlay_font_scale: 1.0,
            reduce_motion: false,
            high_contrast: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AssistantPreferences {
    #[serde(default)]
    pub assistant_preset_id: Option<String>,
    #[serde(default)]
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub objective: Option<String>,
    #[serde(default)]
    pub audience: Option<String>,
    #[serde(default)]
    pub company_or_product_notes: Option<String>,
    #[serde(default)]
    pub preferred_tone: Option<String>,
    #[serde(default)]
    pub forbidden_topics: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettingsFile {
    pub hosted_warning_acknowledged: bool,
    pub stealth_hotkey: String,
    pub send_transcript_hotkey: String,
    pub onboarding_completed: bool,
    pub microphone_permission_granted: bool,
    pub screen_permission_granted: bool,
    pub transcription_language_mode: String,
    pub transcription_language_custom: Option<String>,
    #[serde(default)]
    pub model_routing: ModelRoutingConfig,
    /// Last display chosen for screen snapshots (xcap monitor id).
    #[serde(default)]
    pub default_snapshot_monitor_id: Option<u32>,
    /// Preferred microphone input device (cpal device name). `None` = OS default.
    #[serde(default)]
    pub preferred_microphone: Option<String>,
    /// macOS only: use the native on-device speech recognizer (SFSpeechRecognizer)
    /// instead of a cloud STT provider. Opt-in fallback for transcribing without
    /// an API key; ignored on other platforms.
    #[serde(default)]
    pub macos_native_speech: bool,
    /// Default assistant / system prompt — persists across sessions.
    #[serde(default)]
    pub assistant: AssistantPreferences,
    /// Custom directory for exported session documents (.md). None = `{data_dir}/exports`.
    #[serde(default)]
    pub documents_export_dir: Option<String>,
    #[serde(default)]
    pub accessibility: AccessibilitySettings,
}

impl Default for AppSettingsFile {
    fn default() -> Self {
        Self {
            hosted_warning_acknowledged: false,
            stealth_hotkey: "Ctrl+Shift+H".into(),
            send_transcript_hotkey: "Ctrl+Shift+O".into(),
            onboarding_completed: false,
            microphone_permission_granted: false,
            screen_permission_granted: false,
            transcription_language_mode: "auto".into(),
            transcription_language_custom: None,
            model_routing: ModelRoutingConfig::default(),
            default_snapshot_monitor_id: None,
            preferred_microphone: None,
            macos_native_speech: false,
            assistant: AssistantPreferences::default(),
            documents_export_dir: None,
            accessibility: AccessibilitySettings::default(),
        }
    }
}

pub struct AppSettingsStore {
    path: std::path::PathBuf,
    inner: Mutex<AppSettingsFile>,
}

impl AppSettingsStore {
    pub fn load(data_dir: &Path) -> Self {
        let path = data_dir.join("app_settings.json");
        let mut migrated_hotkey = false;
        let inner = if path.exists() {
            let mut settings: AppSettingsFile = fs::read_to_string(&path)
                .ok()
                .and_then(|raw| serde_json::from_str(&raw).ok())
                .unwrap_or_default();
            if settings.send_transcript_hotkey == "Ctrl+D" {
                settings.send_transcript_hotkey = "Ctrl+Shift+O".into();
                migrated_hotkey = true;
            }
            settings
        } else {
            AppSettingsFile::default()
        };
        let store = Self {
            path,
            inner: Mutex::new(inner),
        };
        if migrated_hotkey {
            if let Ok(guard) = store.inner.lock() {
                let _ = store.persist(&guard);
            }
        }
        store
    }

    pub fn get(&self) -> Result<AppSettingsFile, String> {
        let guard = self.inner.lock().map_err(|e| e.to_string())?;
        Ok(guard.clone())
    }

    pub fn set_hosted_warning_acknowledged(&self, value: bool) -> Result<(), String> {
        let mut guard = self.inner.lock().map_err(|e| e.to_string())?;
        guard.hosted_warning_acknowledged = value;
        self.persist(&guard)
    }

    #[allow(dead_code)]
    pub fn set_stealth_hotkey(&self, value: String) -> Result<(), String> {
        let mut guard = self.inner.lock().map_err(|e| e.to_string())?;
        guard.stealth_hotkey = value;
        self.persist(&guard)
    }

    pub fn set_model_routing(&self, routing: ModelRoutingConfig) -> Result<(), String> {
        let mut guard = self.inner.lock().map_err(|e| e.to_string())?;
        guard.model_routing = routing;
        self.persist(&guard)
    }

    pub fn update<F>(&self, mutate: F) -> Result<AppSettingsFile, String>
    where
        F: FnOnce(&mut AppSettingsFile),
    {
        let mut guard = self.inner.lock().map_err(|e| e.to_string())?;
        mutate(&mut guard);
        self.persist(&guard)?;
        Ok(guard.clone())
    }

    fn persist(&self, settings: &AppSettingsFile) -> Result<(), String> {
        let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
        fs::write(&self.path, raw).map_err(|e| e.to_string())
    }
}
