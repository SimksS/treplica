use provider_core::transcription::resolve_transcript_language;
use provider_core::TranscriptionRequest;

use crate::providers::adapter::request_transcription;
use crate::providers::privacy::resolve_for_session;
use crate::providers::router::resolve_for_transcription;
use crate::storage::AppState;

pub struct SttChunkResult {
    pub text: String,
    pub transcript_language: String,
}

fn validate_audio_container(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 16 {
        return Err(
            "trecho de áudio incompleto — aguarde o próximo ciclo de gravação".into(),
        );
    }
    let valid = bytes.starts_with(&[0x1a, 0x45, 0xdf, 0xa3])
        || bytes.starts_with(b"OggS")
        || bytes.starts_with(b"RIFF")
        || bytes.starts_with(b"ID3")
        || (bytes[0] == 0xff && bytes.len() > 1 && bytes[1] & 0xe0 == 0xe0)
        || (bytes.len() > 8 && bytes[4..8] == *b"ftyp");
    if !valid {
        return Err(
            "arquivo de áudio inválido para a API (fragmento corrompido). Reinicie a captura."
                .into(),
        );
    }
    Ok(())
}

fn file_name_for_mime(mime_type: &str) -> &'static str {
    let m = mime_type.to_lowercase();
    if m.contains("ogg") {
        "chunk.ogg"
    } else if m.contains("mp4") || m.contains("m4a") {
        "chunk.m4a"
    } else if m.contains("mpeg") || m.contains("mp3") {
        "chunk.mp3"
    } else if m.contains("wav") {
        "chunk.wav"
    } else if m.contains("flac") {
        "chunk.flac"
    } else {
        "chunk.webm"
    }
}

pub struct SystemSttService;

impl SystemSttService {
    pub async fn transcribe_chunk(
        state: &AppState,
        session_id: &str,
        audio_bytes: Vec<u8>,
        file_name: String,
        mime_type: String,
        source_language: Option<String>,
    ) -> Result<SttChunkResult, String> {
        validate_audio_container(&audio_bytes)?;
        if audio_bytes.len() < 128 {
            return Err("trecho de áudio muito curto ou silencioso".into());
        }
        const MAX_BYTES: usize = 12 * 1024 * 1024;
        if audio_bytes.len() > MAX_BYTES {
            return Err("trecho de áudio excede o limite de 12 MB".into());
        }

        // Opt-in macOS on-device path (SFSpeechRecognizer). When enabled, it
        // fully replaces the cloud call for this chunk, so users can transcribe
        // without configuring a cloud provider. Default stays cloud STT.
        #[cfg(target_os = "macos")]
        {
            let use_native = state
                .app_settings
                .get()
                .map(|s| s.macos_native_speech)
                .unwrap_or(false);
            if use_native {
                use crate::audio::macos_speech;
                let locale = macos_speech::locale_for_source(source_language.as_deref());
                let detected = macos_speech::transcript_language_for_locale(&locale);
                let bytes = audio_bytes.clone();
                let loc = locale.clone();
                let text = tokio::task::spawn_blocking(move || {
                    macos_speech::transcribe_wav_bytes(&bytes, &loc, true)
                })
                .await
                .map_err(|e| e.to_string())??;
                let transcript_language =
                    resolve_transcript_language(source_language.as_deref(), detected.as_deref());
                return Ok(SttChunkResult {
                    text,
                    transcript_language,
                });
            }
        }

        let (resolved, privacy) = state.with_repo_str(|repo| {
            let resolved = resolve_for_transcription(state, repo)?;
            let session = repo.get_session(session_id).map_err(|e| e.to_string())?;
            let privacy = resolve_for_session(repo, &session, &resolved)?;
            Ok((resolved, privacy))
        })?;

        let whisper_lang = source_language.as_ref().and_then(|s| {
            let t = s.trim().to_lowercase();
            if t.is_empty() || t == "auto" {
                None
            } else {
                Some(t.split('-').next().unwrap_or(&t).to_string())
            }
        });

        let mime = mime_type.trim().to_string();
        let name = if file_name.is_empty() {
            file_name_for_mime(&mime).to_string()
        } else {
            file_name
        };

        let response = request_transcription(
            &resolved,
            TranscriptionRequest {
                audio_bytes,
                file_name: name,
                mime_type: mime,
                language: whisper_lang,
                privacy_mode: privacy,
            },
        )
        .await
        .map_err(|e| e.to_string())?;

        let transcript_language = resolve_transcript_language(
            source_language.as_deref(),
            response.detected_language.as_deref(),
        );

        Ok(SttChunkResult {
            text: response.text,
            transcript_language,
        })
    }
}
