use crate::chat_parse::{is_model_echo, normalize_model_key};
use crate::hosted::{default_groq, default_nvidia, default_openai};
use crate::{ProviderError, ProviderErrorCode, ProviderResult};

pub const HEALTH_CHECK_SYSTEM: &str =
    "Você está em um teste automático de conectividade. Siga a instrução do usuário ao pé da letra.";
pub const HEALTH_CHECK_USER: &str =
    "Responda apenas com a palavra OK, sem pontuação, explicação ou texto adicional.";

const STUB_MARKERS: &[&str] = &[
    "_(Fallback",
    "Fallback local:",
    "Fallback:",
    "stub=true",
    "Peça esclarecimento antes de responder",
    "Prepare pontos de abertura alinhados",
];

/// Models that route to speech-to-text APIs instead of chat completions.
pub fn is_transcription_model(model: &str) -> bool {
    let m = model.to_lowercase();
    m.contains("whisper") || m.contains("scribe") || m.contains("/stt")
}

/// Maps a connection model to a chat model for guidance/translation/etc.
/// Whisper/STT ids are not valid for `/chat/completions`.
pub fn resolve_chat_model(connection_model: &str, base_url: &str, provider_kind: &str) -> String {
    if !is_transcription_model(connection_model) {
        return connection_model.trim().to_string();
    }
    let url = base_url.to_lowercase();
    if url.contains("groq.com") {
        return default_groq().model;
    }
    if url.contains("openrouter.ai") {
        return "meta-llama/llama-3.3-70b-instruct".into();
    }
    match provider_kind {
        "openai" => default_openai().model,
        "groq" => default_groq().model,
        "nvidia" => default_nvidia().model,
        "ollama" => "llama3.2".into(),
        _ => default_openai().model,
    }
}

/// Maps a connection model to the Whisper/STT id used by `/audio/transcriptions`.
/// Chat models (Llama, GPT, etc.) are not valid for STT — use provider defaults.
pub fn resolve_stt_model(connection_model: &str, base_url: &str, provider_kind: &str) -> String {
    if is_transcription_model(connection_model) {
        return connection_model.trim().to_string();
    }
    let url = base_url.to_lowercase();
    if url.contains("groq.com") {
        return "whisper-large-v3".into();
    }
    if url.contains("openrouter.ai") {
        return "openai/whisper-1".into();
    }
    match provider_kind {
        "openai" => "whisper-1".into(),
        "nvidia" => "openai/whisper-large-v3".into(),
        "groq" => "whisper-large-v3".into(),
        _ => "whisper-1".into(),
    }
}

pub fn validate_health_reply(text: &str, model: &str) -> ProviderResult<()> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            "o provedor respondeu sem conteúdo útil",
        ));
    }

    if is_model_echo(trimmed, model) {
        return Err(ProviderError::structured(
            ProviderErrorCode::ModelUnavailable,
            format!(
                "a API devolveu o nome do modelo em vez de uma resposta válida; confira o id do modelo ({model})"
            ),
        ));
    }

    for marker in STUB_MARKERS {
        if trimmed.contains(marker) {
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                "a conexão falhou e o app usaria resposta simulada; configure URL, chave e modelo corretos",
            ));
        }
    }

    let lower = trimmed.to_lowercase();
    if health_reply_acceptable(&lower) {
        return Ok(());
    }

    Err(ProviderError::structured(
        ProviderErrorCode::Unknown,
        format!(
            "resposta inesperada no teste (esperado OK): {}",
            preview(trimmed, 120)
        ),
    ))
}

fn health_reply_acceptable(lower: &str) -> bool {
    lower == "ok"
        || lower == "okay"
        || lower.starts_with("ok ")
        || lower.ends_with(" ok")
        || lower.contains(" ok ")
        || lower.contains("ok!")
        || lower.contains("ok.")
}

fn preview(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max).collect();
    out.push('…');
    out
}

/// Returns true when `model_id` appears in a typical OpenAI-style `/models` list.
pub fn models_list_contains(body: &serde_json::Value, model: &str) -> bool {
    let target = normalize_model_key(model);
    let entries = body
        .get("data")
        .and_then(|d| d.as_array())
        .into_iter()
        .flatten()
        .chain(
            body.get("models")
                .and_then(|m| m.as_array())
                .into_iter()
                .flatten(),
        );

    for entry in entries {
        let id = entry
            .get("id")
            .or_else(|| entry.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let key = normalize_model_key(id);
        if key == target
            || key.ends_with(&format!("/{target}"))
            || target.ends_with(&format!("/{key}"))
            || key.contains(&target)
            || target.contains(&key)
        {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_ok_replies() {
        assert!(validate_health_reply("OK", "gpt-4o-mini").is_ok());
        assert!(validate_health_reply("ok!", "gpt-4o-mini").is_ok());
    }

    #[test]
    fn rejects_stub_markers() {
        assert!(validate_health_reply(
            "Peça esclarecimento antes de responder com detalhes",
            "gpt-4o"
        )
        .is_err());
    }

    #[test]
    fn detects_whisper_models() {
        assert!(is_transcription_model("openai/whisper-1"));
        assert!(!is_transcription_model("meta-llama/llama-3.1-8b"));
    }

    #[test]
    fn resolve_chat_model_uses_llama_for_groq_whisper() {
        assert_eq!(
            resolve_chat_model(
                "whisper-large-v3",
                "https://api.groq.com/openai/v1",
                "groq"
            ),
            "llama-3.3-70b-versatile"
        );
        assert_eq!(
            resolve_chat_model(
                "llama-3.1-8b-instant",
                "https://api.groq.com/openai/v1",
                "groq"
            ),
            "llama-3.1-8b-instant"
        );
    }

    #[test]
    fn resolve_stt_model_uses_whisper_for_groq_chat() {
        assert_eq!(
            resolve_stt_model(
                "llama-3.1-8b-instant",
                "https://api.groq.com/openai/v1",
                "groq"
            ),
            "whisper-large-v3"
        );
        assert_eq!(
            resolve_stt_model(
                "whisper-large-v3",
                "https://api.groq.com/openai/v1",
                "groq"
            ),
            "whisper-large-v3"
        );
    }

    #[test]
    fn models_list_finds_whisper_id() {
        let body = serde_json::json!({
            "data": [
                {"id": "openai/whisper-1"},
                {"id": "meta-llama/llama-3.1-8b-instruct"}
            ]
        });
        assert!(models_list_contains(&body, "openai/whisper-1"));
        assert!(!models_list_contains(&body, "anthropic/claude-3"));
    }
}
