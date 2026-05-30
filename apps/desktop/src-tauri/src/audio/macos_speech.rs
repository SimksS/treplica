//! Native macOS on-device speech recognition (SFSpeechRecognizer), reached
//! through the Objective-C bridge in `native/treplica_speech.m`.
//!
//! This is an **opt-in fallback** so macOS users can transcribe without a cloud
//! STT provider (the macOS analogue of the Windows Web Speech fallback, which
//! doesn't work in WKWebView). The default remains cloud STT, which also offers
//! language auto-detection — something SFSpeechRecognizer cannot do, hence the
//! best-effort locale mapping below.

use std::ffi::CString;
use std::os::raw::{c_char, c_int};

// Result codes mirror the `TRP_*` constants in native/treplica_speech.m.
const TRP_OK: c_int = 0;
const TRP_ERR_AUTH: c_int = -2;
const TRP_ERR_UNAVAILABLE: c_int = -3;
const TRP_ERR_TIMEOUT: c_int = -5;

extern "C" {
    fn treplica_macos_speech_supported() -> c_int;
    fn treplica_macos_transcribe_wav(
        wav_path: *const c_char,
        locale_id: *const c_char,
        prefer_on_device: c_int,
        out_buf: *mut c_char,
        out_cap: usize,
    ) -> c_int;
}

/// Whether the OS exposes SFSpeechRecognizer (macOS 10.15+).
pub fn native_speech_supported() -> bool {
    // Safe: the C function only reads an availability flag.
    unsafe { treplica_macos_speech_supported() == 1 }
}

/// Map the app's source-language hint to a macOS locale identifier.
/// Returns an empty string for "auto"/unknown so the bridge falls back to the
/// system locale (SFSpeechRecognizer requires a fixed locale; it can't detect).
pub fn locale_for_source(source_language: Option<&str>) -> String {
    let raw = source_language
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_default();
    if raw.is_empty() || raw == "auto" {
        return String::new();
    }
    let primary = raw.split(['-', '_']).next().unwrap_or(raw.as_str());
    match primary {
        "pt" => "pt-BR".to_string(),
        "en" => "en-US".to_string(),
        "es" => "es-ES".to_string(),
        "fr" => "fr-FR".to_string(),
        "de" => "de-DE".to_string(),
        "it" => "it-IT".to_string(),
        "ja" => "ja-JP".to_string(),
        "zh" => "zh-CN".to_string(),
        // Already a full BCP-47 tag (has a region) — pass through; otherwise use
        // the bare primary subtag and let the OS pick a default region.
        _ if raw.contains('-') => raw,
        _ => primary.to_string(),
    }
}

/// The 2-letter language for the resolved locale, or `None` for "auto".
pub fn transcript_language_for_locale(locale_id: &str) -> Option<String> {
    if locale_id.is_empty() {
        None
    } else {
        locale_id.split(['-', '_']).next().map(|s| s.to_string())
    }
}

/// Transcribe in-memory WAV bytes. Writes them to a temp file (the URL-based
/// recognition request needs a file) and cleans it up afterward.
pub fn transcribe_wav_bytes(
    bytes: &[u8],
    locale_id: &str,
    prefer_on_device: bool,
) -> Result<String, String> {
    use std::io::Write;

    let mut path = std::env::temp_dir();
    path.push(format!("treplica-stt-{}.wav", uuid::Uuid::new_v4()));
    {
        let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
        file.write_all(bytes).map_err(|e| e.to_string())?;
    }
    let result = transcribe_wav_file(path.to_string_lossy().as_ref(), locale_id, prefer_on_device);
    let _ = std::fs::remove_file(&path);
    result
}

fn transcribe_wav_file(
    wav_path: &str,
    locale_id: &str,
    prefer_on_device: bool,
) -> Result<String, String> {
    let c_path = CString::new(wav_path).map_err(|_| "caminho de áudio inválido".to_string())?;
    let c_locale = CString::new(locale_id).map_err(|_| "locale inválido".to_string())?;
    let mut buf = vec![0u8; 16 * 1024];

    // Safe: pointers are valid for the call, the buffer is sized by `out_cap`,
    // and the bridge always NUL-terminates within `out_cap`.
    let code = unsafe {
        treplica_macos_transcribe_wav(
            c_path.as_ptr(),
            c_locale.as_ptr(),
            if prefer_on_device { 1 } else { 0 },
            buf.as_mut_ptr() as *mut c_char,
            buf.len(),
        )
    };

    match code {
        TRP_OK => {
            let end = buf.iter().position(|&b| b == 0).unwrap_or(buf.len());
            let text = String::from_utf8_lossy(&buf[..end]).trim().to_string();
            if text.is_empty() {
                // Marker recognized by stt_failure::transcription_is_no_speech,
                // so an empty segment is skipped instead of surfaced as an error.
                Err("WHISPER_NO_SPEECH: nenhuma fala detectada neste trecho".to_string())
            } else {
                Ok(text)
            }
        }
        TRP_ERR_AUTH => Err(
            "Reconhecimento de fala do macOS não autorizado. Autorize em Ajustes do Sistema → \
             Privacidade e Segurança → Reconhecimento de Fala."
                .to_string(),
        ),
        TRP_ERR_UNAVAILABLE => Err(
            "Reconhecimento de fala nativo indisponível para o idioma selecionado no macOS. \
             Tente outro idioma ou use um provedor de transcrição na nuvem."
                .to_string(),
        ),
        TRP_ERR_TIMEOUT => {
            Err("Tempo limite no reconhecimento de fala nativo do macOS.".to_string())
        }
        _ => Err("Falha no reconhecimento de fala nativo do macOS.".to_string()),
    }
}
