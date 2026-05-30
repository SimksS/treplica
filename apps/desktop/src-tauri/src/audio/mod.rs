#[cfg(target_os = "macos")]
pub mod macos_speech;
pub mod native_mic_capture;
pub mod native_system_capture;
pub mod stt_rate_limit;
pub mod system_stt;
pub mod stt_failure;
pub mod transcription;
