use crate::commands::session_dto::TranscriptTickUpdateDto;
use crate::commands::CommandResponse;

/// Classifies provider/STT failures for the frontend (billing, auth, rate limit).
pub fn transcription_failure_response(err: String) -> CommandResponse<TranscriptTickUpdateDto> {
    let code = transcription_error_code(&err);
    let message = friendly_transcription_message(&err);
    CommandResponse::failure(code, message)
}

pub fn transcription_is_no_speech(err: &str) -> bool {
    err.contains("WHISPER_NO_SPEECH") || err.to_lowercase().contains("nenhuma fala")
}

pub fn transcription_error_code(err: &str) -> &'static str {
    if transcription_is_no_speech(err) {
        return "transcription_no_speech";
    }
    let lower = err.to_lowercase();
    if lower.contains("privacy_blocked") || lower.contains("somente local") {
        return "transcription_privacy_blocked";
    }
    if lower.contains("402")
        || lower.contains("payment required")
        || (lower.contains("balance") && lower.contains("audio"))
        || (lower.contains("insufficient")
            && (lower.contains("credit") || lower.contains("balance") || lower.contains("billing")))
    {
        return "transcription_payment_required";
    }
    if lower.contains("authenticationfailed")
        || lower.contains("401")
        || lower.contains("403")
        || lower.contains("invalid api key")
        || lower.contains("incorrect api key")
    {
        return "transcription_auth_failed";
    }
    if lower.contains("ratelimited") || lower.contains("429") || lower.contains("rate limit") {
        return "transcription_rate_limited";
    }
    "transcription_error"
}

pub fn friendly_transcription_message(err: &str) -> String {
    let lower = err.to_lowercase();
    if lower.contains("privacy_blocked") || lower.contains("somente local") {
        return "Modo somente local ativo: transcrição na nuvem (microfone e áudio do sistema) está bloqueada. Desative em Configurações → Privacidade ou use Web Speech no microfone.".into();
    }
    if lower.contains("402")
        || lower.contains("payment required")
        || (lower.contains("balance") && lower.contains("audio"))
    {
        return "Transcrição na nuvem indisponível: saldo insuficiente no provedor (OpenRouter exige ~US$ 0,50 para áudio). Use o microfone com Web Speech ou configure Groq/OpenAI com créditos.".into();
    }
    if lower.contains("401") || lower.contains("403") || lower.contains("authenticationfailed") {
        return "Chave de API inválida ou sem permissão para transcrição. Verifique o provedor em Configurações ou use Web Speech no microfone.".into();
    }
    if lower.contains("429") || lower.contains("ratelimited") {
        return "Limite de requisições da API de transcrição atingido. Tente mais tarde ou use Web Speech no microfone.".into();
    }
    if transcription_is_no_speech(err) {
        return "Nenhuma fala clara neste trecho (silêncio ou ruído). Fale mais alto ou aguarde o próximo ciclo.".into();
    }
    if lower.contains("valid media file") || lower.contains("invalid_request_error") {
        return "O trecho de áudio enviado estava incompleto ou em formato inválido. Reinicie a sessão e fale após ~4s de captura; o app agora grava arquivos completos por trecho.".into();
    }
    strip_provider_error_prefix(err)
}

fn strip_provider_error_prefix(err: &str) -> String {
    if let Some((_, msg)) = err.split_once(": ") {
        if err.starts_with("AuthenticationFailed")
            || err.starts_with("ProviderUnavailable")
            || err.starts_with("RateLimited")
            || err.starts_with("InvalidConfiguration")
        {
            return msg.to_string();
        }
    }
    err.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_openrouter_payment_error() {
        let err = "AuthenticationFailed: OpenRouter transcription 402 Payment Required: {\"error\":{\"message\":\"requires balance\"}}";
        assert_eq!(
            transcription_error_code(err),
            "transcription_payment_required"
        );
        assert!(friendly_transcription_message(err).contains("Web Speech"));
    }
}
