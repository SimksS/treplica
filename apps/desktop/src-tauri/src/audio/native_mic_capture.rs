//! Native microphone capture (cpal default input device).
//!
//! Mirrors `native_system_capture` but reads the microphone instead of the
//! system loopback. This runs on a dedicated OS thread in the Rust backend, so
//! it is **not** affected by WebView throttling — unlike the old browser-based
//! mic path, which froze whenever the main webview was backgrounded behind the
//! stealth overlay (no VAD ticks → no transcription until the user muted).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

use crate::audio::native_system_capture::NativeSystemAudioStatusPayload;
use crate::audio::stt_failure;
use crate::audio::system_stt::SystemSttService;
use crate::commands::session_dto::tick_update_from_result;
use crate::sessions::ai_activity;
use crate::sessions::live_pipeline::ingest_live_transcript_segment;

/// On Windows the OS/driver path delivers a relatively loud mic signal, so the
/// gates sit higher than the system-audio module to reject room noise without
/// clipping real speech.
///
/// macOS is different: the native (cpal) path receives the raw input with **no
/// automatic gain control** — unlike the previous browser `getUserMedia` path,
/// which set `autoGainControl: true`. Built-in macOS mics therefore land far
/// quieter, often below these gates, so speech never opened a VAD segment and
/// nothing reached transcription (while the meter still moved, thanks to the
/// display gain). We compensate with `MIC_INPUT_GAIN` below and with lower
/// gates here so the macOS mic behaves like Windows. Windows keeps the original
/// values (and unity gain), so its behavior is unchanged.
#[cfg(not(target_os = "macos"))]
const SPEECH_LEVEL_THRESHOLD: f32 = 0.012;
#[cfg(target_os = "macos")]
const SPEECH_LEVEL_THRESHOLD: f32 = 0.006;
const SILENCE_END_MS: u64 = 500;
const MIN_SEGMENT_MS: u64 = 400;
/// Send rolling chunks during continuous speech so translation is near real-time
/// instead of waiting for a pause.
const ROLLING_FLUSH_MS: u64 = 4_000;
const MAX_SEGMENT_MS: u64 = 8_000;
const MIN_WAV_BYTES: usize = 400;
#[cfg(not(target_os = "macos"))]
const MIN_SPEECH_PEAK: f32 = 0.02;
#[cfg(target_os = "macos")]
const MIN_SPEECH_PEAK: f32 = 0.01;
/// Makeup gain applied to the raw mic buffer before VAD/metering/WAV (macOS
/// only). Replaces the AGC the old browser path provided, bringing the
/// gain-less native input up to a level Whisper transcribes reliably. Output is
/// clamped, so the common built-in mic never clips and a rare already-loud
/// external mic is protected too. Windows uses a no-op (see `apply_mic_input_gain`).
#[cfg(target_os = "macos")]
const MIC_INPUT_GAIN: f32 = 3.0;
const MAX_PENDING_STT: usize = 3;
const METER_DISPLAY_GAIN: f32 = 1.4;
const STATUS_EVENT: &str = "native-mic-status";
const SPEAKER_LABEL: &str = "Você";

struct VadState {
    segment_samples: Vec<f32>,
    segment_started_at: Option<Instant>,
    silence_started_at: Option<Instant>,
    segment_peak: f32,
}

struct PendingSegment {
    samples: Vec<f32>,
    sample_rate: u32,
    peak: f32,
}

impl VadState {
    fn reset_segment(&mut self) {
        self.segment_samples.clear();
        self.segment_started_at = None;
        self.silence_started_at = None;
        self.segment_peak = 0.0;
    }
}

fn idle_status() -> NativeSystemAudioStatusPayload {
    NativeSystemAudioStatusPayload {
        active: false,
        audio_level: 0.0,
        chunks_sent: 0,
        chunks_skipped: 0,
        status: "idle".into(),
        error: None,
    }
}

pub struct NativeMicCaptureController {
    stop_flag: Arc<AtomicBool>,
    busy: Arc<AtomicBool>,
    thread: Mutex<Option<JoinHandle<()>>>,
    status: Arc<Mutex<NativeSystemAudioStatusPayload>>,
    /// Session that currently holds the mic. Used to guard against stale
    /// frontend stop commands that arrive after a new session has started.
    current_session: Mutex<Option<String>>,
}

impl NativeMicCaptureController {
    pub fn new() -> Self {
        Self {
            stop_flag: Arc::new(AtomicBool::new(true)),
            busy: Arc::new(AtomicBool::new(false)),
            thread: Mutex::new(None),
            status: Arc::new(Mutex::new(idle_status())),
            current_session: Mutex::new(None),
        }
    }

    pub fn status(&self) -> NativeSystemAudioStatusPayload {
        self.status
            .lock()
            .map(|g| g.clone())
            .unwrap_or_else(|_| idle_status())
    }

    fn patch_status<F>(&self, update: F)
    where
        F: FnOnce(&mut NativeSystemAudioStatusPayload),
    {
        if let Ok(mut guard) = self.status.lock() {
            update(&mut guard);
        }
    }

    fn emit_status(&self, app: &AppHandle) {
        let _ = app.emit(STATUS_EVENT, self.status());
    }

    pub fn is_running(&self) -> bool {
        !self.stop_flag.load(Ordering::SeqCst)
    }

    pub fn stop(&self) {
        self.stop_flag.store(true, Ordering::SeqCst);
        if let Ok(mut guard) = self.thread.lock() {
            if let Some(handle) = guard.take() {
                let _ = handle.join();
            }
        }
        if let Ok(mut sid) = self.current_session.lock() {
            *sid = None;
        }
        self.patch_status(|s| {
            s.active = false;
            s.status = "idle".into();
            s.audio_level = 0.0;
        });
    }

    /// Stop only if the controller is running for the given session.
    /// Returns `true` if a stop was performed, `false` if the session didn't match.
    pub fn stop_for_session(&self, session_id: &str) -> bool {
        let matches = self
            .current_session
            .lock()
            .ok()
            .and_then(|g| g.clone())
            .map(|s| s == session_id)
            .unwrap_or(false);
        if matches {
            self.stop();
            true
        } else {
            false
        }
    }

    pub fn set_muted(&self, muted: bool) {
        MUTED.store(muted, Ordering::SeqCst);
    }

    pub fn start(
        &self,
        app: AppHandle,
        session_id: String,
        source_language: Option<String>,
        muted: bool,
        preferred_device: Option<String>,
    ) -> Result<(), String> {
        if self.is_running() {
            self.set_muted(muted);
            return Ok(());
        }

        // Ensure any previous capture thread is fully stopped before opening a new stream.
        self.stop();
        self.set_muted(muted);

        if let Ok(mut sid) = self.current_session.lock() {
            *sid = Some(session_id.clone());
        }
        self.stop_flag.store(false, Ordering::SeqCst);
        self.patch_status(|s| {
            s.active = true;
            s.status = "capturing".into();
            s.error = None;
            s.chunks_sent = 0;
            s.chunks_skipped = 0;
        });
        self.emit_status(&app);

        let stop_flag = Arc::clone(&self.stop_flag);
        let busy = Arc::clone(&self.busy);
        let status = Arc::clone(&self.status);

        let handle = thread::spawn(move || {
            if let Err(e) = run_mic_capture(
                app.clone(),
                session_id,
                source_language,
                stop_flag,
                busy,
                status.clone(),
                preferred_device,
            ) {
                if let Ok(mut s) = status.lock() {
                    s.active = false;
                    s.status = "error".into();
                    s.error = Some(e.clone());
                }
                let _ = app.emit(
                    STATUS_EVENT,
                    NativeSystemAudioStatusPayload {
                        active: false,
                        audio_level: 0.0,
                        chunks_sent: 0,
                        chunks_skipped: 0,
                        status: "error".into(),
                        error: Some(e),
                    },
                );
            }
        });

        if let Ok(mut guard) = self.thread.lock() {
            *guard = Some(handle);
        }
        Ok(())
    }
}

impl Default for NativeMicCaptureController {
    fn default() -> Self {
        Self::new()
    }
}

/// Live status of a microphone test: a short-lived capture used purely to show
/// an input-level meter so the user can confirm the selected device picks up
/// sound. It never transcribes and auto-stops after `MIC_TEST_MAX_MS`.
#[derive(Clone, serde::Serialize)]
pub struct MicTestStatusPayload {
    pub active: bool,
    pub level: f32,
    pub error: Option<String>,
}

const MIC_TEST_EVENT: &str = "microphone-test";
const MIC_TEST_MAX_MS: u64 = 15_000;

pub struct MicTestController {
    stop_flag: Arc<AtomicBool>,
    thread: Mutex<Option<JoinHandle<()>>>,
}

impl MicTestController {
    pub fn new() -> Self {
        Self {
            stop_flag: Arc::new(AtomicBool::new(true)),
            thread: Mutex::new(None),
        }
    }

    pub fn stop(&self) {
        self.stop_flag.store(true, Ordering::SeqCst);
        if let Ok(mut guard) = self.thread.lock() {
            if let Some(handle) = guard.take() {
                let _ = handle.join();
            }
        }
    }

    pub fn start(&self, app: AppHandle, preferred_device: Option<String>) -> Result<(), String> {
        // Restart cleanly if a previous test is still running.
        self.stop();
        self.stop_flag.store(false, Ordering::SeqCst);

        let stop_flag = Arc::clone(&self.stop_flag);
        let handle = thread::spawn(move || {
            if let Err(e) = run_mic_test(app.clone(), preferred_device, stop_flag.clone()) {
                let _ = app.emit(
                    MIC_TEST_EVENT,
                    MicTestStatusPayload {
                        active: false,
                        level: 0.0,
                        error: Some(e),
                    },
                );
            }
            stop_flag.store(true, Ordering::SeqCst);
        });

        if let Ok(mut guard) = self.thread.lock() {
            *guard = Some(handle);
        }
        Ok(())
    }
}

impl Default for MicTestController {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn run_mic_test(
    app: AppHandle,
    preferred_device: Option<String>,
    stop_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    use crate::audio::native_system_capture::{rms_level, samples_to_mono};
    use cpal::traits::{DeviceTrait, StreamTrait};
    use cpal::{InputCallbackInfo, SampleFormat};

    let host = cpal::default_host();
    let device = resolve_input_device(&host, preferred_device.as_deref())
        .ok_or_else(|| "Nenhum microfone encontrado.".to_string())?;

    let supported = device
        .default_input_config()
        .map_err(|e| format!("Configuração do microfone indisponível: {e}"))?;
    let channels = supported.channels() as usize;
    let sample_format = supported.sample_format();
    let stream_config: cpal::StreamConfig = supported.into();

    let meter_smooth = Arc::new(Mutex::new(0.0f32));
    let err_fn = |err: cpal::StreamError| {
        eprintln!("microphone test stream error: {err}");
    };

    macro_rules! test_stream {
        ($sample:ty) => {{
            let stop_cb = Arc::clone(&stop_flag);
            let meter = Arc::clone(&meter_smooth);
            let app_cb = app.clone();
            device.build_input_stream(
                &stream_config,
                move |data: &[$sample], _: &InputCallbackInfo| {
                    if stop_cb.load(Ordering::SeqCst) {
                        return;
                    }
                    // Match the session capture path so the test meter reflects
                    // the gain-compensated level the session will actually see.
                    let mut mono = samples_to_mono::<$sample>(data, channels);
                    apply_mic_input_gain(&mut mono);
                    let rms = rms_level(&mono);
                    let level = smooth_meter_level(&meter, rms);
                    let _ = app_cb.emit(
                        MIC_TEST_EVENT,
                        MicTestStatusPayload {
                            active: true,
                            level,
                            error: None,
                        },
                    );
                },
                err_fn,
                None,
            )
        }};
    }

    let stream = match sample_format {
        SampleFormat::F32 => test_stream!(f32),
        SampleFormat::F64 => test_stream!(f64),
        SampleFormat::I16 => test_stream!(i16),
        SampleFormat::U16 => test_stream!(u16),
        SampleFormat::I32 => test_stream!(i32),
        SampleFormat::I24 => test_stream!(cpal::I24),
        other => {
            return Err(format!("Formato de áudio do microfone não suportado: {other}"));
        }
    }
    .map_err(mic_start_error)?;

    stream
        .play()
        .map_err(|e| format!("Falha ao iniciar o microfone: {e}"))?;

    let started = Instant::now();
    while !stop_flag.load(Ordering::SeqCst)
        && started.elapsed() < Duration::from_millis(MIC_TEST_MAX_MS)
    {
        thread::sleep(Duration::from_millis(120));
    }

    drop(stream);
    let _ = app.emit(
        MIC_TEST_EVENT,
        MicTestStatusPayload {
            active: false,
            level: 0.0,
            error: None,
        },
    );
    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn run_mic_test(
    _app: AppHandle,
    _preferred_device: Option<String>,
    _stop_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    Err("Teste de microfone não disponível nesta plataforma.".into())
}

pub fn native_microphone_supported() -> bool {
    cfg!(any(target_os = "windows", target_os = "macos"))
}

/// A microphone input device the user can choose from in settings.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrophoneDeviceInfo {
    /// Stable-ish identifier used to select the device. We use the device name
    /// because cpal exposes no platform-independent unique id.
    pub id: String,
    /// Human-friendly label shown in the UI.
    pub label: String,
    /// Whether this is the OS default input device.
    pub is_default: bool,
}

/// Enumerate the available microphone input devices. Returns an empty list on
/// unsupported platforms or when enumeration fails, so the UI can fall back to
/// "default device" silently.
pub fn list_microphone_devices() -> Vec<MicrophoneDeviceInfo> {
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        use cpal::traits::HostTrait;

        let host = cpal::default_host();
        let default_id = host
            .default_input_device()
            .and_then(|d| device_stable_id(&d));

        let mut out = Vec::new();
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                let Some(id) = device_stable_id(&device) else {
                    continue;
                };
                let is_default = default_id.as_deref() == Some(id.as_str());
                out.push(MicrophoneDeviceInfo {
                    id,
                    label: device_label(&device),
                    is_default,
                });
            }
        }
        out
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Vec::new()
    }
}

/// Stable identifier for a device. Prefers the backend endpoint id (unique even
/// when several devices share the generic name "Microfone"); falls back to the
/// name so selection still works on backends without ids.
#[cfg(any(target_os = "windows", target_os = "macos"))]
fn device_stable_id(device: &cpal::Device) -> Option<String> {
    use cpal::traits::DeviceTrait;
    device
        .id()
        .ok()
        .map(|d| d.1)
        .or_else(|| device.name().ok())
}

/// Human-friendly label. cpal's `name()` is the generic device class on Windows
/// (so every mic shows as "Microfone"); the real Windows "friendly name" (e.g.
/// "Microfone (2- USB Audio Device)") lives in the description's extended lines,
/// with the driver/interface name as a secondary disambiguator.
#[cfg(any(target_os = "windows", target_os = "macos"))]
fn device_label(device: &cpal::Device) -> String {
    use cpal::traits::DeviceTrait;

    if let Ok(desc) = device.description() {
        if let Some(friendly) = desc.extended().iter().find(|s| !s.trim().is_empty()) {
            return friendly.clone();
        }
        if let Some(driver) = desc.driver().filter(|d| !d.trim().is_empty()) {
            return format!("{} ({})", desc.name(), driver);
        }
        if !desc.name().trim().is_empty() {
            return desc.name().to_string();
        }
    }
    device
        .name()
        .unwrap_or_else(|_| "Microfone desconhecido".to_string())
}

/// Process-wide mute flag — toggled from the UI without restarting the stream.
static MUTED: AtomicBool = AtomicBool::new(false);

/// Boost and clamp each sample by the macOS makeup gain, in place.
#[cfg(target_os = "macos")]
fn apply_mic_input_gain(samples: &mut [f32]) {
    for s in samples.iter_mut() {
        *s = (*s * MIC_INPUT_GAIN).clamp(-1.0, 1.0);
    }
}

/// No-op on non-macOS targets (Windows mic input needs no makeup gain), so the
/// capture hot path is completely unchanged there.
#[cfg(not(target_os = "macos"))]
#[inline]
fn apply_mic_input_gain(_samples: &mut [f32]) {}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn run_mic_capture(
    app: AppHandle,
    session_id: String,
    source_language: Option<String>,
    stop_flag: Arc<AtomicBool>,
    busy: Arc<AtomicBool>,
    status: Arc<Mutex<NativeSystemAudioStatusPayload>>,
    preferred_device: Option<String>,
) -> Result<(), String> {
    use crate::audio::native_system_capture::samples_to_mono;
    use cpal::traits::{DeviceTrait, StreamTrait};
    use cpal::{InputCallbackInfo, SampleFormat};

    let host = cpal::default_host();
    let device = resolve_input_device(&host, preferred_device.as_deref())
        .ok_or_else(|| "Nenhum microfone encontrado.".to_string())?;

    let supported = device
        .default_input_config()
        .map_err(|e| format!("Configuração do microfone indisponível: {e}"))?;

    let sample_rate: u32 = supported.sample_rate();
    let channels = supported.channels() as usize;
    let sample_format = supported.sample_format();
    let stream_config: cpal::StreamConfig = supported.into();

    let vad = Arc::new(Mutex::new(VadState {
        segment_samples: Vec::new(),
        segment_started_at: None,
        silence_started_at: None,
        segment_peak: 0.0,
    }));
    let meter_smooth = Arc::new(Mutex::new(0.0f32));
    let pending = Arc::new(Mutex::new(Vec::<PendingSegment>::new()));

    let app_emit = app.clone();
    let session_ingest = session_id.clone();
    let lang_ingest = source_language.clone();
    let err_fn = |err: cpal::StreamError| {
        eprintln!("native microphone stream error: {err}");
    };

    macro_rules! mic_stream {
        ($sample:ty) => {{
            let stop_cb = Arc::clone(&stop_flag);
            let vad = Arc::clone(&vad);
            let status_cb = Arc::clone(&status);
            let busy_cb = Arc::clone(&busy);
            let meter_smooth = Arc::clone(&meter_smooth);
            let pending = Arc::clone(&pending);
            let app_emit = app_emit.clone();
            let session_ingest = session_ingest.clone();
            let lang_ingest = lang_ingest.clone();
            device.build_input_stream(
                &stream_config,
                move |data: &[$sample], _: &InputCallbackInfo| {
                    let mut mono = samples_to_mono::<$sample>(data, channels);
                    apply_mic_input_gain(&mut mono);
                    on_mic_buffer(
                        &mono,
                        sample_rate,
                        &stop_cb,
                        &vad,
                        &status_cb,
                        &busy_cb,
                        &pending,
                        &meter_smooth,
                        &app_emit,
                        &session_ingest,
                        &lang_ingest,
                    );
                },
                err_fn,
                None,
            )
        }};
    }

    let stream = match sample_format {
        SampleFormat::F32 => mic_stream!(f32),
        SampleFormat::F64 => mic_stream!(f64),
        SampleFormat::I16 => mic_stream!(i16),
        SampleFormat::U16 => mic_stream!(u16),
        SampleFormat::I32 => mic_stream!(i32),
        SampleFormat::I24 => mic_stream!(cpal::I24),
        other => {
            return Err(format!("Formato de áudio do microfone não suportado: {other}"));
        }
    }
    .map_err(mic_start_error)?;

    stream
        .play()
        .map_err(|e| format!("Falha ao iniciar o microfone: {e}"))?;

    while !stop_flag.load(Ordering::SeqCst) {
        let payload = status.lock().map(|g| g.clone()).unwrap_or_else(|_| idle_status());
        let _ = app.emit(STATUS_EVENT, payload);
        thread::sleep(Duration::from_millis(120));
    }

    drop(stream);
    if let Ok(mut s) = status.lock() {
        s.active = false;
        s.status = "idle".into();
        s.audio_level = 0.0;
    }
    let _ = app.emit(STATUS_EVENT, status.lock().map(|g| g.clone()).ok());
    Ok(())
}

/// Pick the input device matching `preferred` (by name). Falls back to the OS
/// default device when `preferred` is `None`, empty, or no longer connected —
/// this preserves the original behavior for users who never chose a device.
#[cfg(any(target_os = "windows", target_os = "macos"))]
fn resolve_input_device(
    host: &cpal::Host,
    preferred: Option<&str>,
) -> Option<cpal::Device> {
    use cpal::traits::{DeviceTrait, HostTrait};

    if let Some(want) = preferred.map(str::trim).filter(|n| !n.is_empty()) {
        if let Ok(mut devices) = host.input_devices() {
            if let Some(found) = devices.find(|d| {
                device_stable_id(d).as_deref() == Some(want)
                    || d.name().map(|n| n == want).unwrap_or(false)
            }) {
                return Some(found);
            }
        }
    }
    host.default_input_device()
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
#[allow(clippy::too_many_arguments)]
fn on_mic_buffer(
    mono: &[f32],
    sample_rate: u32,
    stop_flag: &Arc<AtomicBool>,
    vad: &Arc<Mutex<VadState>>,
    status: &Arc<Mutex<NativeSystemAudioStatusPayload>>,
    busy: &Arc<AtomicBool>,
    pending: &Arc<Mutex<Vec<PendingSegment>>>,
    meter_smooth: &Arc<Mutex<f32>>,
    app: &AppHandle,
    session_id: &str,
    source_language: &Option<String>,
) {
    use crate::audio::native_system_capture::{rms_level, vad_level};

    if stop_flag.load(Ordering::SeqCst) {
        return;
    }

    // Muting drops the segment in progress and reports a flat meter, but keeps
    // the stream open so unmuting resumes instantly.
    if MUTED.load(Ordering::SeqCst) {
        if let Ok(mut g) = vad.lock() {
            g.reset_segment();
        }
        if let Ok(mut s) = status.lock() {
            s.audio_level = 0.0;
        }
        return;
    }

    let rms = rms_level(mono);
    let level = vad_level(mono, rms);
    let meter = smooth_meter_level(meter_smooth, rms);
    if let Ok(mut s) = status.lock() {
        s.audio_level = meter;
    }

    let now = Instant::now();
    let mut vad_guard = match vad.lock() {
        Ok(g) => g,
        Err(_) => return,
    };

    vad_guard.segment_peak = vad_guard.segment_peak.max(level);
    let recording = vad_guard.segment_started_at.is_some();

    if !recording {
        if level >= SPEECH_LEVEL_THRESHOLD {
            vad_guard.segment_started_at = Some(now);
            vad_guard.silence_started_at = None;
            vad_guard.segment_samples.clear();
            vad_guard.segment_peak = level;
            vad_guard.segment_samples.extend_from_slice(mono);
        }
    } else {
        let segment_dur = now
            .duration_since(vad_guard.segment_started_at.unwrap())
            .as_millis() as u64;

        if segment_dur >= MAX_SEGMENT_MS {
            let peak = vad_guard.segment_peak;
            let samples = std::mem::take(&mut vad_guard.segment_samples);
            vad_guard.reset_segment();
            drop(vad_guard);
            schedule_segment_flush(
                samples, sample_rate, peak, busy, pending, app, session_id, source_language,
                status,
            );
        } else if level >= SPEECH_LEVEL_THRESHOLD {
            vad_guard.silence_started_at = None;
            vad_guard.segment_samples.extend_from_slice(mono);
            let segment_dur = now
                .duration_since(vad_guard.segment_started_at.unwrap())
                .as_millis() as u64;
            if segment_dur >= ROLLING_FLUSH_MS {
                let peak = vad_guard.segment_peak;
                let samples = std::mem::take(&mut vad_guard.segment_samples);
                vad_guard.segment_started_at = Some(now);
                vad_guard.segment_peak = level;
                vad_guard.silence_started_at = None;
                drop(vad_guard);
                schedule_segment_flush(
                    samples, sample_rate, peak, busy, pending, app, session_id, source_language,
                    status,
                );
            }
        } else {
            if vad_guard.silence_started_at.is_none() {
                vad_guard.silence_started_at = Some(now);
            }
            vad_guard.segment_samples.extend_from_slice(mono);
            let silence_dur = now
                .duration_since(vad_guard.silence_started_at.unwrap())
                .as_millis() as u64;
            if silence_dur >= SILENCE_END_MS && segment_dur >= MIN_SEGMENT_MS {
                let peak = vad_guard.segment_peak;
                let samples = std::mem::take(&mut vad_guard.segment_samples);
                vad_guard.reset_segment();
                drop(vad_guard);
                schedule_segment_flush(
                    samples, sample_rate, peak, busy, pending, app, session_id, source_language,
                    status,
                );
            }
        }
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn mic_start_error(err: cpal::BuildStreamError) -> String {
    let base = format!("Falha ao iniciar o microfone: {err}");
    if cfg!(target_os = "macos") {
        format!(
            "{base} Verifique em Ajustes do Sistema → Privacidade e Segurança → Microfone se o Treplica está autorizado."
        )
    } else {
        format!("{base} Verifique as permissões de microfone do Windows para o Treplica.")
    }
}

fn meter_display_level(rms: f32) -> f32 {
    if !rms.is_finite() || rms <= 0.0 {
        return 0.0;
    }
    (rms * METER_DISPLAY_GAIN).clamp(0.0, 1.0).sqrt()
}

fn smooth_meter_level(meter_smooth: &Arc<Mutex<f32>>, rms: f32) -> f32 {
    let instant = meter_display_level(rms);
    let Ok(mut prev) = meter_smooth.lock() else {
        return instant;
    };
    let smoothed = if instant > *prev {
        *prev * 0.55 + instant * 0.45
    } else {
        *prev * 0.9 + instant * 0.1
    };
    *prev = smoothed.clamp(0.0, 1.0);
    *prev
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn enqueue_pending(pending: &Arc<Mutex<Vec<PendingSegment>>>, segment: PendingSegment) {
    if let Ok(mut queue) = pending.lock() {
        if queue.len() >= MAX_PENDING_STT {
            queue.remove(0);
        }
        queue.push(segment);
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
#[allow(clippy::too_many_arguments)]
fn schedule_segment_flush(
    samples: Vec<f32>,
    sample_rate: u32,
    peak: f32,
    busy: &Arc<AtomicBool>,
    pending: &Arc<Mutex<Vec<PendingSegment>>>,
    app: &AppHandle,
    session_id: &str,
    source_language: &Option<String>,
    status: &Arc<Mutex<NativeSystemAudioStatusPayload>>,
) {
    use crate::audio::native_system_capture::samples_to_wav;

    if samples.is_empty() {
        return;
    }
    if peak < MIN_SPEECH_PEAK {
        if let Ok(mut s) = status.lock() {
            s.chunks_skipped += 1;
        }
        return;
    }

    let wav = match samples_to_wav(&samples, sample_rate) {
        Ok(b) => b,
        Err(_) => {
            if let Ok(mut s) = status.lock() {
                s.chunks_skipped += 1;
            }
            return;
        }
    };

    if wav.len() < MIN_WAV_BYTES {
        if let Ok(mut s) = status.lock() {
            s.chunks_skipped += 1;
        }
        return;
    }

    let rate_ok = app
        .try_state::<crate::storage::AppState>()
        .map(|s| s.stt_rate_limit_mic.can_send_now())
        .unwrap_or(true);

    if busy.load(Ordering::SeqCst) || !rate_ok {
        enqueue_pending(
            pending,
            PendingSegment {
                samples,
                sample_rate,
                peak,
            },
        );
        return;
    }

    run_segment_stt(wav, busy, pending, app, session_id, source_language, status);
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn drain_pending_queue(
    busy: &Arc<AtomicBool>,
    pending: &Arc<Mutex<Vec<PendingSegment>>>,
    app: &AppHandle,
    session_id: &str,
    source_language: &Option<String>,
    status: &Arc<Mutex<NativeSystemAudioStatusPayload>>,
) {
    use crate::audio::native_system_capture::samples_to_wav;

    if busy.load(Ordering::SeqCst) {
        return;
    }
    let Some(state) = app.try_state::<crate::storage::AppState>() else {
        return;
    };
    if !state.stt_rate_limit_mic.can_send_now() {
        return;
    }

    let next = pending.lock().ok().and_then(|mut q| {
        if q.is_empty() {
            None
        } else {
            Some(q.remove(0))
        }
    });
    let Some(segment) = next else {
        return;
    };

    if segment.peak < MIN_SPEECH_PEAK {
        drain_pending_queue(busy, pending, app, session_id, source_language, status);
        return;
    }

    let wav = match samples_to_wav(&segment.samples, segment.sample_rate) {
        Ok(b) => b,
        Err(_) => {
            drain_pending_queue(busy, pending, app, session_id, source_language, status);
            return;
        }
    };
    if wav.len() < MIN_WAV_BYTES {
        drain_pending_queue(busy, pending, app, session_id, source_language, status);
        return;
    }

    run_segment_stt(wav, busy, pending, app, session_id, source_language, status);
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn run_segment_stt(
    wav: Vec<u8>,
    busy: &Arc<AtomicBool>,
    pending: &Arc<Mutex<Vec<PendingSegment>>>,
    app: &AppHandle,
    session_id: &str,
    source_language: &Option<String>,
    status: &Arc<Mutex<NativeSystemAudioStatusPayload>>,
) {
    busy.store(true, Ordering::SeqCst);
    if let Ok(mut s) = status.lock() {
        s.status = "transcribing".into();
    }
    let _ = app.emit(STATUS_EVENT, status.lock().map(|g| g.clone()).ok());

    let app = app.clone();
    let session_id = session_id.to_string();
    let source_language = source_language.clone();
    let busy = Arc::clone(busy);
    let pending = Arc::clone(pending);
    let status = Arc::clone(status);

    tauri::async_runtime::spawn(async move {
        let Some(state) = app.try_state::<crate::storage::AppState>() else {
            busy.store(false, Ordering::SeqCst);
            return;
        };

        state.stt_rate_limit_mic.mark_sent();

        let result = ai_activity::with_activity(Some(&app), &session_id, "transcription", || {
            SystemSttService::transcribe_chunk(
                &state,
                &session_id,
                wav,
                "chunk.wav".into(),
                "audio/wav".into(),
                source_language.clone(),
            )
        })
        .await;

        match result {
            Ok(stt) => {
                if let Ok(ingest) = ingest_live_transcript_segment(
                    &state,
                    &session_id,
                    &stt.text,
                    Some(SPEAKER_LABEL.into()),
                    &stt.transcript_language,
                    Some(&app),
                )
                .await
                {
                    let dto = tick_update_from_result(ingest);
                    let _ = app.emit("live-transcript-tick", &dto);
                    if let Ok(mut s) = status.lock() {
                        s.chunks_sent += 1;
                        s.status = "capturing".into();
                    }
                }
            }
            Err(e) => {
                if !stt_failure::transcription_is_no_speech(&e) {
                    if let Ok(mut s) = status.lock() {
                        s.error = Some(stt_failure::friendly_transcription_message(&e));
                        s.status = "error".into();
                    }
                } else if let Ok(mut s) = status.lock() {
                    s.chunks_skipped += 1;
                }
            }
        }

        busy.store(false, Ordering::SeqCst);
        if let Ok(mut s) = status.lock() {
            if s.status == "transcribing" {
                s.status = "capturing".into();
            }
        }
        let _ = app.emit(STATUS_EVENT, status.lock().map(|g| g.clone()).ok());

        drain_pending_queue(&busy, &pending, &app, &session_id, &source_language, &status);
    });
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn run_mic_capture(
    _app: AppHandle,
    _session_id: String,
    _source_language: Option<String>,
    _stop_flag: Arc<AtomicBool>,
    _busy: Arc<AtomicBool>,
    _status: Arc<Mutex<NativeSystemAudioStatusPayload>>,
    _preferred_device: Option<String>,
) -> Result<(), String> {
    Err("Captura nativa de microfone não disponível nesta plataforma.".into())
}
