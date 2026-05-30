//! Native system-audio loopback (WASAPI on Windows, Core Audio tap on macOS 14.6+).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::audio::stt_failure;
use crate::audio::system_stt::SystemSttService;
use crate::commands::session_dto::tick_update_from_result;
use crate::sessions::ai_activity;
use crate::sessions::live_pipeline::ingest_live_transcript_segment;

/// Loopback mix is often quieter than microphone input; use lower gates (RMS-based).
const SPEECH_LEVEL_THRESHOLD: f32 = 0.003;
const SILENCE_END_MS: u64 = 450;
const MIN_SEGMENT_MS: u64 = 400;
/// Send rolling chunks during continuous speech (videos, podcasts) without waiting for pauses.
const ROLLING_FLUSH_MS: u64 = 4_500;
const MAX_SEGMENT_MS: u64 = 6_000;
const MIN_WAV_BYTES: usize = 400;
const MIN_SPEECH_PEAK: f32 = 0.004;
const MAX_PENDING_STT: usize = 3;
/// Display-only gain (VAD uses unscaled RMS/peak). Tuned to sit near the mic meter (~10–40% typical).
const METER_DISPLAY_GAIN: f32 = 2.2;

#[derive(Clone, Serialize)]
pub struct NativeSystemAudioStatusPayload {
    pub active: bool,
    pub audio_level: f32,
    pub chunks_sent: u32,
    pub chunks_skipped: u32,
    pub status: String,
    pub error: Option<String>,
}

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

pub struct NativeSystemCaptureController {
    stop_flag: Arc<AtomicBool>,
    busy: Arc<AtomicBool>,
    thread: Mutex<Option<JoinHandle<()>>>,
    status: Arc<Mutex<NativeSystemAudioStatusPayload>>,
}

impl NativeSystemCaptureController {
    pub fn new() -> Self {
        Self {
            stop_flag: Arc::new(AtomicBool::new(true)),
            busy: Arc::new(AtomicBool::new(false)),
            thread: Mutex::new(None),
            status: Arc::new(Mutex::new(NativeSystemAudioStatusPayload {
                active: false,
                audio_level: 0.0,
                chunks_sent: 0,
                chunks_skipped: 0,
                status: "idle".into(),
                error: None,
            })),
        }
    }

    pub fn status(&self) -> NativeSystemAudioStatusPayload {
        self.status
            .lock()
            .map(|g| g.clone())
            .unwrap_or_else(|_| NativeSystemAudioStatusPayload {
                active: false,
                audio_level: 0.0,
                chunks_sent: 0,
                chunks_skipped: 0,
                status: "idle".into(),
                error: None,
            })
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
        let _ = app.emit("native-system-audio-status", self.status());
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
        self.patch_status(|s| {
            s.active = false;
            s.status = "idle".into();
            s.audio_level = 0.0;
        });
    }

    pub fn start(
        &self,
        app: AppHandle,
        session_id: String,
        source_language: Option<String>,
    ) -> Result<(), String> {
        if self.is_running() {
            return Ok(());
        }

        // Ensure any previous capture thread is fully stopped before opening a new stream.
        self.stop();

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
            if let Err(e) = run_loopback_capture(
                app.clone(),
                session_id,
                source_language,
                stop_flag,
                busy,
                status.clone(),
            ) {
                if let Ok(mut s) = status.lock() {
                    s.active = false;
                    s.status = "error".into();
                    s.error = Some(e.clone());
                }
                let _ = app.emit(
                    "native-system-audio-status",
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

pub fn native_loopback_supported() -> bool {
    cfg!(any(target_os = "windows", target_os = "macos"))
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn run_loopback_capture(
    app: AppHandle,
    session_id: String,
    source_language: Option<String>,
    stop_flag: Arc<AtomicBool>,
    busy: Arc<AtomicBool>,
    status: Arc<Mutex<NativeSystemAudioStatusPayload>>,
) -> Result<(), String> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use cpal::{InputCallbackInfo, SampleFormat};

    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or_else(|| "Nenhum dispositivo de saída de áudio encontrado.".to_string())?;

    let supported = device
        .default_output_config()
        .map_err(|e| format!("Configuração de áudio indisponível: {e}"))?;

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
        eprintln!("native system audio stream error: {err}");
    };

    macro_rules! loopback_stream {
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
                    let mono = samples_to_mono::<$sample>(data, channels);
                    on_loopback_buffer(
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
        SampleFormat::F32 => loopback_stream!(f32),
        SampleFormat::F64 => loopback_stream!(f64),
        SampleFormat::I16 => loopback_stream!(i16),
        SampleFormat::U16 => loopback_stream!(u16),
        SampleFormat::I32 => loopback_stream!(i32),
        SampleFormat::I24 => loopback_stream!(cpal::I24),
        other => {
            return Err(format!(
                "Formato de áudio do sistema não suportado: {other}"
            ));
        }
    }
    .map_err(loopback_start_error)?;

    stream
        .play()
        .map_err(|e| format!("Falha ao reproduzir stream de captura: {e}"))?;

    while !stop_flag.load(Ordering::SeqCst) {
        let payload = status
            .lock()
            .map(|g| g.clone())
            .unwrap_or_else(|_| NativeSystemAudioStatusPayload {
                active: false,
                audio_level: 0.0,
                chunks_sent: 0,
                chunks_skipped: 0,
                status: "idle".into(),
                error: None,
            });
        let _ = app.emit("native-system-audio-status", payload);
        thread::sleep(Duration::from_millis(120));
    }

    drop(stream);
    if let Ok(mut s) = status.lock() {
        s.active = false;
        s.status = "idle".into();
        s.audio_level = 0.0;
    }
    let _ = app.emit("native-system-audio-status", status.lock().map(|g| g.clone()).ok());
    Ok(())
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
#[allow(clippy::too_many_arguments)]
fn on_loopback_buffer(
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
    if stop_flag.load(Ordering::SeqCst) {
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
                samples,
                sample_rate,
                peak,
                busy,
                pending,
                app,
                session_id,
                source_language,
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
                    samples,
                    sample_rate,
                    peak,
                    busy,
                    pending,
                    app,
                    session_id,
                    source_language,
                    status,
                );
                return;
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
                    samples,
                    sample_rate,
                    peak,
                    busy,
                    pending,
                    app,
                    session_id,
                    source_language,
                    status,
                );
            }
        }
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn loopback_start_error(err: cpal::BuildStreamError) -> String {
    let base = format!("Falha ao iniciar captura de áudio do sistema: {err}");
    if cfg!(target_os = "macos") {
        format!(
            "{base} Verifique em Ajustes do Sistema → Privacidade e Segurança → Gravação de áudio do sistema se o Treplica está autorizado."
        )
    } else {
        base
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
pub(crate) fn samples_to_mono<T>(data: &[T], channels: usize) -> Vec<f32>
where
    T: cpal::Sample,
    f32: cpal::FromSample<T>,
{
    use cpal::Sample;
    let ch = channels.max(1);
    let floats: Vec<f32> = data
        .iter()
        .map(|s| f32::from_sample(*s))
        .filter(|s| s.is_finite())
        .collect();
    if ch <= 1 {
        return floats;
    }
    floats
        .chunks(ch)
        .map(|frame| {
            if frame.is_empty() {
                0.0
            } else {
                frame.iter().sum::<f32>() / frame.len() as f32
            }
        })
        .collect()
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
pub(crate) fn rms_level(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|s| s * s).sum();
    (sum / samples.len() as f32).sqrt().min(1.0)
}

/// Level used for VAD on loopback (RMS-first; peak only as a light boost).
pub(crate) fn vad_level(samples: &[f32], rms: f32) -> f32 {
    if !rms.is_finite() || rms <= 0.0 {
        return 0.0;
    }
    let finite: Vec<f32> = samples.iter().copied().filter(|s| s.is_finite()).collect();
    let peak = finite
        .iter()
        .map(|s| s.abs())
        .fold(0.0f32, f32::max);
    rms.max(peak * 0.25).min(1.0)
}

fn meter_display_level(rms: f32) -> f32 {
    if !rms.is_finite() || rms <= 0.0 {
        return 0.0;
    }
    let scaled = (rms * METER_DISPLAY_GAIN).clamp(0.0, 1.0);
    scaled.sqrt()
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
fn enqueue_pending(
    pending: &Arc<Mutex<Vec<PendingSegment>>>,
    segment: PendingSegment,
) {
    if let Ok(mut queue) = pending.lock() {
        if queue.len() >= MAX_PENDING_STT {
            queue.remove(0);
        }
        queue.push(segment);
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
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
        .map(|s| s.stt_rate_limit_system.can_send_now())
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

    run_segment_stt(
        wav,
        busy,
        pending,
        app,
        session_id,
        source_language,
        status,
    );
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
    if busy.load(Ordering::SeqCst) {
        return;
    }
    let Some(state) = app.try_state::<crate::storage::AppState>() else {
        return;
    };
    if !state.stt_rate_limit_system.can_send_now() {
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

    run_segment_stt(
        wav,
        busy,
        pending,
        app,
        session_id,
        source_language,
        status,
    );
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
    let _ = app.emit(
        "native-system-audio-status",
        status.lock().map(|g| g.clone()).ok(),
    );

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

        state.stt_rate_limit_system.mark_sent();

        let result = ai_activity::with_activity(
            Some(&app),
            &session_id,
            "transcription",
            || {
                SystemSttService::transcribe_chunk(
                    &state,
                    &session_id,
                    wav,
                    "chunk.wav".into(),
                    "audio/wav".into(),
                    source_language.clone(),
                )
            },
        )
        .await;

        match result {
            Ok(stt) => {
                if let Ok(ingest) = ingest_live_transcript_segment(
                    &state,
                    &session_id,
                    &stt.text,
                    Some("Sistema".into()),
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
        let _ = app.emit(
            "native-system-audio-status",
            status.lock().map(|g| g.clone()).ok(),
        );

        drain_pending_queue(
            &busy,
            &pending,
            &app,
            &session_id,
            &source_language,
            &status,
        );
    });
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
pub(crate) fn samples_to_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    use std::io::Cursor;

    let mut cursor = Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::new(&mut cursor, spec).map_err(|e| e.to_string())?;
    for &sample in samples {
        let amp = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        writer.write_sample(amp).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;
    Ok(cursor.into_inner())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn run_loopback_capture(
    _app: AppHandle,
    _session_id: String,
    _source_language: Option<String>,
    _stop_flag: Arc<AtomicBool>,
    _busy: Arc<AtomicBool>,
    _status: Arc<Mutex<NativeSystemAudioStatusPayload>>,
) -> Result<(), String> {
    Err("Captura nativa de áudio do sistema não disponível nesta plataforma.".into())
}
