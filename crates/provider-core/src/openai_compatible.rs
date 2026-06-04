use std::sync::OnceLock;
use std::time::Duration;

use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;

use crate::chat_parse::parse_openai_completions_body;
use crate::health::{
    is_transcription_model, models_list_contains, validate_health_reply, HEALTH_CHECK_SYSTEM,
    HEALTH_CHECK_USER,
};
use crate::prompts::{self, parse_suggestion_type_hint};
use crate::transcription::{
    is_whisper_hallucination, normalize_detected_language, translation_system_prompt,
    translation_user_message, NO_SPEECH_MARKER,
};
use crate::vision::{build_vision_system_prompt, build_vision_user_prompt, parse_image_data_url};
use crate::{
    ChatRole, DocumentGenerationRequest, DocumentGenerationResponse, GuidanceRequest,
    GuidanceResponse, ProviderAdapter, ProviderCapability, ProviderError, ProviderErrorCode,
    ProviderKind, ProviderMetadata, ProviderResult, SuggestionType, TranscriptionRequest,
    TranscriptionResponse, TranslationRequest, TranslationResponse, VisionRequest, VisionResponse,
};

fn shared_http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .expect("openai-compatible http client")
    })
}

fn is_openrouter_base(base_url: &str) -> bool {
    base_url.to_lowercase().contains("openrouter.ai")
}

fn openrouter_audio_format(mime_type: &str) -> &'static str {
    let m = mime_type.to_lowercase();
    if m.contains("webm") {
        return "webm";
    }
    if m.contains("ogg") {
        return "ogg";
    }
    if m.contains("mp3") || m.contains("mpeg") {
        return "mp3";
    }
    if m.contains("wav") {
        return "wav";
    }
    if m.contains("flac") {
        return "flac";
    }
    if m.contains("m4a") || m.contains("mp4") {
        return "m4a";
    }
    "webm"
}

fn normalize_whisper_mime(mime_type: &str) -> String {
    let m = mime_type.to_lowercase();
    if m.contains("webm") {
        return "audio/webm".into();
    }
    if m.contains("ogg") {
        return "audio/ogg".into();
    }
    if m.contains("mp4") || m.contains("mpeg") {
        return "audio/mp4".into();
    }
    if m.is_empty() {
        return "audio/webm".into();
    }
    mime_type.to_string()
}

fn vision_title_from(text: &str) -> String {
    let first = text
        .split(['.', '!', '?', '\n'])
        .find(|s| !s.trim().is_empty())
        .unwrap_or(text)
        .trim();
    if first.chars().count() <= 72 {
        return first.to_string();
    }
    let mut out: String = first.chars().take(72).collect();
    out.push('…');
    out
}

fn health_preview(text: &str, max: usize) -> String {
    let t = text.trim();
    if t.chars().count() <= max {
        return t.to_string();
    }
    let mut out: String = t.chars().take(max).collect();
    out.push('…');
    out
}

fn parse_transcription_body(body: &str) -> (String, Option<String>) {
    let trimmed = body.trim();
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
        let text = v
            .get("text")
            .and_then(|t| t.as_str())
            .map(str::to_string)
            .unwrap_or_else(|| trimmed.to_string());
        let lang = v
            .get("language")
            .and_then(|l| l.as_str())
            .map(normalize_detected_language);
        return (text.trim().to_string(), lang);
    }
    (trimmed.to_string(), None)
}

fn map_network(_err: reqwest::Error) -> ProviderError {
    ProviderError::structured(
        ProviderErrorCode::ProviderUnavailable,
        "provider network request failed",
    )
}

fn sanitize_http_error(operation: &str, status: u16) -> String {
    format!("{operation} request failed with HTTP {status}")
}

/// Builds the OpenAI chat `messages` array for a guidance request: a system message
/// followed by the per-session conversation (memory). Context images are attached to
/// the current (last) user turn. Falls back to a single stateless user prompt when no
/// conversation memory is present.
fn openai_guidance_messages(
    system: &str,
    request: &GuidanceRequest,
) -> ProviderResult<Vec<serde_json::Value>> {
    let mut messages = vec![json!({"role": "system", "content": system})];
    let images = &request.context_image_data_urls;

    if request.conversation.is_empty() {
        let user = prompts::build_user_prompt(request);
        messages.push(openai_user_message(&user, images)?);
        return Ok(messages);
    }

    let last = request.conversation.len() - 1;
    for (i, turn) in request.conversation.iter().enumerate() {
        match turn.role {
            ChatRole::Assistant => {
                messages.push(json!({"role": "assistant", "content": turn.content}));
            }
            ChatRole::User => {
                if i == last && !images.is_empty() {
                    messages.push(openai_user_message(&turn.content, images)?);
                } else {
                    messages.push(json!({"role": "user", "content": turn.content}));
                }
            }
        }
    }
    Ok(messages)
}

/// A user message; multimodal (text + images) when images are supplied.
fn openai_user_message(text: &str, images: &[String]) -> ProviderResult<serde_json::Value> {
    if images.is_empty() {
        return Ok(json!({"role": "user", "content": text}));
    }
    let mut content = vec![json!({"type": "text", "text": text})];
    for url in images {
        let parsed = parse_image_data_url(url)?;
        content.push(json!({
            "type": "image_url",
            "image_url": {"url": parsed.data_url}
        }));
    }
    Ok(json!({"role": "user", "content": content}))
}

/// Maps HTTP status from STT endpoints (Whisper / OpenRouter audio).
pub fn map_transcription_http_status(status: u16, provider_label: &str, _raw: &str) -> ProviderError {
    let code = match status {
        401 | 402 | 403 => ProviderErrorCode::AuthenticationFailed,
        429 => ProviderErrorCode::RateLimited,
        _ => ProviderErrorCode::ProviderUnavailable,
    };
    ProviderError::structured(
        code,
        sanitize_http_error(&format!("{provider_label} transcription"), status),
    )
}

pub struct OpenAiCompatibleAdapter {
    pub base_url: String,
    pub model: String,
    pub api_key: Option<String>,
    pub is_local: bool,
    pub display_name: String,
}

impl OpenAiCompatibleAdapter {
    pub fn new(
        base_url: impl Into<String>,
        model: impl Into<String>,
        api_key: Option<String>,
        is_local: bool,
        display_name: impl Into<String>,
    ) -> Self {
        Self {
            base_url: base_url.into(),
            model: model.into(),
            api_key,
            is_local,
            display_name: display_name.into(),
        }
    }

    async fn chat_completion(&self, system: &str, user: &str) -> ProviderResult<String> {
        if self.base_url.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "base_url is required for chat API",
            ));
        }
        if self.model.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "model is required for chat API",
            ));
        }
        if !self.is_local && self.api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
            return Err(ProviderError::structured(
                ProviderErrorCode::AuthenticationFailed,
                "API key is required for hosted providers",
            ));
        }

        let url = format!(
            "{}/chat/completions",
            self.base_url.trim_end_matches('/')
        );
        let body = json!({
            "model": self.model,
            "stream": false,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        });

        let mut req = shared_http_client().post(&url).json(&body);
        if let Some(key) = self.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
            req = req.header("Authorization", format!("Bearer {key}"));
        }

        let resp = req.send().await.map_err(map_network)?;
        if !resp.status().is_success() {
            let status = resp.status();
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                sanitize_http_error("chat API", status.as_u16()),
            ));
        }

        let raw = resp.text().await.map_err(map_network)?;
        parse_openai_completions_body(&raw, &self.model)
    }

    /// Posts a pre-built `messages` array (system + conversation history) and parses the reply.
    async fn complete_messages(
        &self,
        messages: Vec<serde_json::Value>,
    ) -> ProviderResult<String> {
        if self.base_url.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "base_url is required for chat API",
            ));
        }
        if self.model.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "model is required for chat API",
            ));
        }
        if !self.is_local && self.api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
            return Err(ProviderError::structured(
                ProviderErrorCode::AuthenticationFailed,
                "API key is required for hosted providers",
            ));
        }

        let url = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));
        let body = json!({
            "model": self.model,
            "stream": false,
            "max_tokens": prompts::GUIDANCE_MAX_TOKENS,
            "messages": messages,
        });

        let mut req = shared_http_client().post(&url).json(&body);
        if let Some(key) = self.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
            req = req.header("Authorization", format!("Bearer {key}"));
        }

        let resp = req.send().await.map_err(map_network)?;
        if !resp.status().is_success() {
            let status = resp.status();
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                sanitize_http_error("chat API", status.as_u16()),
            ));
        }
        let raw = resp.text().await.map_err(map_network)?;
        parse_openai_completions_body(&raw, &self.model)
    }

    async fn vision_chat_completion(
        &self,
        system: &str,
        user: &str,
        image_data_url: &str,
    ) -> ProviderResult<String> {
        if self.base_url.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "base_url is required for vision API",
            ));
        }
        if self.model.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "model is required for vision API",
            ));
        }
        if !self.is_local && self.api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
            return Err(ProviderError::structured(
                ProviderErrorCode::AuthenticationFailed,
                "API key is required for hosted vision providers",
            ));
        }

        let parsed = parse_image_data_url(image_data_url)?;
        let url = format!(
            "{}/chat/completions",
            self.base_url.trim_end_matches('/')
        );
        let body = json!({
            "model": self.model,
            "stream": false,
            "messages": [
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user},
                        {"type": "image_url", "image_url": {"url": parsed.data_url}}
                    ]
                }
            ],
        });

        let mut req = shared_http_client().post(&url).json(&body);
        if let Some(key) = self.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
            req = req.header("Authorization", format!("Bearer {key}"));
        }

        let resp = req.send().await.map_err(map_network)?;
        if !resp.status().is_success() {
            let status = resp.status();
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                sanitize_http_error("vision API", status.as_u16()),
            ));
        }

        let raw = resp.text().await.map_err(map_network)?;
        parse_openai_completions_body(&raw, &self.model)
    }

    pub async fn analyze_image(&self, request: VisionRequest) -> ProviderResult<VisionResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();
        let system = build_vision_system_prompt(request.session_context.system_prompt.as_deref());
        let user = build_vision_user_prompt(
            &request.session_context,
            &request.recent_transcript,
            request.source.as_deref(),
        );
        let text = self
            .vision_chat_completion(&system, &user, &request.image_data_url)
            .await?;
        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        let title = vision_title_from(&text);
        Ok(VisionResponse {
            text: text.clone(),
            title,
            confidence: 0.86,
            grounding_summary: format!(
                "análise visual via {} ({} trechos de transcrição)",
                self.display_name,
                request.recent_transcript.len()
            ),
            content_left_device: !self.is_local,
            latency_ms,
        })
    }

    /// Lightweight reachability check using a probe key.
    /// Does NOT require a real API key — a 4xx auth error proves the server is up.
    /// Returns Err only on network failure, timeout, or a broken endpoint (404/405).
    pub async fn ping(&self) -> ProviderResult<()> {
        if self.base_url.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "base_url is required",
            ));
        }
        let url = format!("{}/models", self.base_url.trim_end_matches('/'));
        let resp = shared_http_client()
            .get(&url)
            .bearer_auth("treplica-connectivity-probe")
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(map_network)?;

        let status = resp.status().as_u16();
        // 2xx → server up (local/open endpoints)
        // 4xx auth errors (401/403/422) → server up, just needs a real key
        // 404/405 → endpoint doesn't exist at this base_url
        match status {
            200..=299 | 401 | 403 | 422 | 429 => Ok(()),
            404 | 405 => Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                format!(
                    "endpoint /models não encontrado (HTTP {status}); verifique a base_url: {}",
                    self.base_url
                ),
            )),
            other => Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                format!("resposta inesperada do servidor (HTTP {other})"),
            )),
        }
    }

    /// Verifies credentials and that the configured model can be used (chat or STT).
    pub async fn health_check(&self) -> ProviderResult<String> {
        if is_transcription_model(&self.model) {
            return self.health_check_transcription().await;
        }
        let text = self
            .chat_completion(HEALTH_CHECK_SYSTEM, HEALTH_CHECK_USER)
            .await?;
        validate_health_reply(&text, &self.model)?;
        Ok(format!(
            "{} OK — modelo {} respondeu: {}",
            self.display_name,
            self.model,
            health_preview(&text, 48)
        ))
    }

    async fn health_check_transcription(&self) -> ProviderResult<String> {
        if self.base_url.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "base_url is required",
            ));
        }
        if !self.is_local && self.api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
            return Err(ProviderError::structured(
                ProviderErrorCode::AuthenticationFailed,
                "API key is required for hosted providers",
            ));
        }

        let url = format!("{}/models", self.base_url.trim_end_matches('/'));
        let mut req = shared_http_client()
            .get(&url)
            .timeout(Duration::from_secs(15));
        if let Some(key) = self.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
            req = req.bearer_auth(key.trim());
        }

        let resp = req.send().await.map_err(map_network)?;
        let status = resp.status();
        let raw = resp.text().await.map_err(map_network)?;
        if !status.is_success() {
            return Err(ProviderError::structured(
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    ProviderErrorCode::AuthenticationFailed
                } else {
                    ProviderErrorCode::ProviderUnavailable
                },
                sanitize_http_error("models API", status.as_u16()),
            ));
        }

        let value: serde_json::Value = serde_json::from_str(raw.trim()).map_err(|e| {
            ProviderError::structured(
                ProviderErrorCode::Unknown,
                format!("invalid models API JSON: {e}"),
            )
        })?;
        if let Some(err) = value.get("error") {
            let msg = err
                .get("message")
                .and_then(|m| m.as_str())
                .or_else(|| err.as_str())
                .unwrap_or("unknown API error");
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                msg.to_string(),
            ));
        }

        if !models_list_contains(&value, &self.model) {
            return Err(ProviderError::structured(
                ProviderErrorCode::ModelUnavailable,
                format!(
                    "modelo de transcrição '{}' não encontrado na conta; verifique o id",
                    self.model
                ),
            ));
        }

        Ok(format!(
            "{} OK — autenticação válida e modelo de transcrição {} disponível",
            self.display_name, self.model
        ))
    }

    fn whisper_model(&self) -> String {
        crate::health::resolve_stt_model(&self.model, &self.base_url, "")
    }

    fn openrouter_stt_model(&self) -> String {
        let m = self.model.trim();
        let lower = m.to_lowercase();
        if lower.contains("whisper") {
            if m.contains('/') {
                return m.to_string();
            }
            return format!("openai/{m}");
        }
        "openai/whisper-1".into()
    }

    async fn transcribe_openrouter_json(
        &self,
        request: &TranscriptionRequest,
        mime: &str,
    ) -> ProviderResult<TranscriptionResponse> {
        use base64::Engine;

        let started = Utc::now();
        let url = format!(
            "{}/audio/transcriptions",
            self.base_url.trim_end_matches('/')
        );
        let model = self.openrouter_stt_model();
        let format = openrouter_audio_format(mime);
        let audio_b64 = base64::engine::general_purpose::STANDARD.encode(&request.audio_bytes);

        let mut body = json!({
            "model": model,
            "temperature": 0,
            "input_audio": {
                "data": audio_b64,
                "format": format,
            },
        });
        if let Some(lang) = request.language.as_ref().filter(|l| !l.is_empty()) {
            let short = lang.split('-').next().unwrap_or(lang.as_str());
            body["language"] = json!(short);
        }

        let mut req = shared_http_client()
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body);
        if let Some(key) = self.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
            req = req.bearer_auth(key.trim());
        }

        let response = req.send().await.map_err(map_network)?;
        let status = response.status();
        let raw = response.text().await.map_err(map_network)?;
        if !status.is_success() {
            return Err(map_transcription_http_status(
                status.as_u16(),
                "OpenRouter",
                &raw,
            ));
        }

        let (trimmed, detected_language) = parse_transcription_body(&raw);
        if trimmed.is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::UnsafeOutput,
                format!("{NO_SPEECH_MARKER}: transcrição vazia"),
            ));
        }
        if is_whisper_hallucination(&trimmed) {
            return Err(ProviderError::structured(
                ProviderErrorCode::UnsafeOutput,
                format!("{NO_SPEECH_MARKER}: {trimmed}"),
            ));
        }

        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        Ok(TranscriptionResponse {
            text: trimmed,
            confidence: 0.9,
            is_uncertain: false,
            content_left_device: !self.is_local,
            latency_ms,
            detected_language,
        })
    }

    async fn transcribe_openai_multipart(
        &self,
        request: TranscriptionRequest,
        mime: &str,
    ) -> ProviderResult<TranscriptionResponse> {
        let started = Utc::now();
        let url = format!(
            "{}/audio/transcriptions",
            self.base_url.trim_end_matches('/')
        );
        let model = self.whisper_model();
        let file_name = if request.file_name.is_empty() {
            if mime.contains("ogg") {
                "chunk.ogg".into()
            } else if mime.contains("mp4") || mime.contains("m4a") {
                "chunk.m4a".into()
            } else if mime.contains("mpeg") || mime.contains("mp3") {
                "chunk.mp3".into()
            } else if mime.contains("wav") {
                "chunk.wav".into()
            } else {
                "chunk.webm".into()
            }
        } else {
            request.file_name.clone()
        };

        let upload_mime = mime.split(';').next().unwrap_or(mime).trim();

        let part = reqwest::multipart::Part::bytes(request.audio_bytes)
            .file_name(file_name)
            .mime_str(upload_mime)
            .map_err(|e| {
                ProviderError::structured(
                    ProviderErrorCode::InvalidConfiguration,
                    format!("invalid audio mime: {e}"),
                )
            })?;
        let mut form = reqwest::multipart::Form::new()
            .part("file", part)
            .text("model", model)
            .text("temperature", "0")
            .text("response_format", "verbose_json");
        if let Some(lang) = request
            .language
            .as_ref()
            .filter(|l| !l.is_empty() && l.to_lowercase() != "auto")
        {
            let short = lang.split('-').next().unwrap_or(lang.as_str());
            form = form.text("language", short.to_string());
        }

        let mut req = shared_http_client().post(&url).multipart(form);
        if let Some(key) = self.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
            req = req.bearer_auth(key.trim());
        }

        let response = req.send().await.map_err(map_network)?;
        let status = response.status();
        let body = response.text().await.map_err(map_network)?;
        if !status.is_success() {
            return Err(map_transcription_http_status(
                status.as_u16(),
                "transcription API",
                &body,
            ));
        }

        let (trimmed, detected_language) = parse_transcription_body(&body);
        if trimmed.is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::UnsafeOutput,
                format!("{NO_SPEECH_MARKER}: transcrição vazia"),
            ));
        }
        if is_whisper_hallucination(&trimmed) {
            return Err(ProviderError::structured(
                ProviderErrorCode::UnsafeOutput,
                format!("{NO_SPEECH_MARKER}: {trimmed}"),
            ));
        }

        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        Ok(TranscriptionResponse {
            text: trimmed,
            confidence: 0.9,
            is_uncertain: false,
            content_left_device: !self.is_local,
            latency_ms,
            detected_language,
        })
    }

    pub async fn transcribe_audio(
        &self,
        request: TranscriptionRequest,
    ) -> ProviderResult<TranscriptionResponse> {
        self.validate_privacy(request.privacy_mode)?;
        if request.audio_bytes.is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "audio chunk is empty",
            ));
        }
        if self.base_url.trim().is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "base_url is required for transcription API",
            ));
        }
        if !self.is_local && self.api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
            return Err(ProviderError::structured(
                ProviderErrorCode::AuthenticationFailed,
                "API key is required for hosted transcription",
            ));
        }

        let mime = normalize_whisper_mime(&request.mime_type);
        if is_openrouter_base(&self.base_url) {
            self.transcribe_openrouter_json(&request, &mime).await
        } else {
            self.transcribe_openai_multipart(request, &mime).await
        }
    }

}

#[async_trait]
impl ProviderAdapter for OpenAiCompatibleAdapter {
    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            provider_kind: ProviderKind::OpenaiCompatible,
            display_name: self.display_name.clone(),
            is_local: self.is_local,
            requires_credentials: !self.is_local,
            supports_streaming: true,
            capabilities: vec![
                ProviderCapability::Chat,
                ProviderCapability::StructuredOutput,
                ProviderCapability::Summarization,
                ProviderCapability::Translation,
                ProviderCapability::Transcription,
                ProviderCapability::Vision,
            ],
        }
    }

    async fn request_transcription(
        &self,
        request: TranscriptionRequest,
    ) -> ProviderResult<TranscriptionResponse> {
        self.transcribe_audio(request).await
    }

    async fn request_guidance(&self, request: GuidanceRequest) -> ProviderResult<GuidanceResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();
        let system = prompts::build_system_prompt(request.session_context.system_prompt.as_deref());
        let fallback_type = request
            .suggestion_type
            .unwrap_or(SuggestionType::Answer);

        let completion = match openai_guidance_messages(&system, &request) {
            Ok(messages) => self.complete_messages(messages).await,
            Err(e) => Err(e),
        };

        let (text, confidence, suggestion_type, used_stub) =
            match completion {
                Ok(model_text) => {
                    let st = parse_suggestion_type_hint(&model_text, fallback_type);
                    (model_text, 0.88, st, false)
                }
                Err(err) => {
                    let (mut text, confidence, suggestion_type, _) = self.stub_guidance(&request);
                    text.push_str(&format!(
                        "\n\n_(Fallback: {err})_"
                    ));
                    (text, confidence, suggestion_type, true)
                }
            };

        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        Ok(GuidanceResponse {
            text,
            suggestion_type,
            confidence,
            grounding_summary: format!(
                "orientação via {} (stub={used_stub}); {} trechos",
                self.display_name,
                request.recent_transcript.len(),
            ),
            content_left_device: !self.is_local,
            latency_ms,
        })
    }

    async fn request_document_generation(
        &self,
        request: DocumentGenerationRequest,
    ) -> ProviderResult<DocumentGenerationResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();
        let title = match request.doc_type.as_str() {
            "follow_up_email" => format!("Follow-up: {}", request.session_title),
            "transcript_export" => format!("Transcrição: {}", request.session_title),
            _ => format!("Resumo: {}", request.session_title),
        };
        let user = format!(
            "Generate a markdown document titled \"{title}\".\nTranscript lines:\n{}\nSuggestions:\n{}",
            request.transcript_lines.join("\n"),
            request.suggestion_lines.join("\n"),
        );
        let system = format!(
            "{}\n\nProduce concise markdown documents in Portuguese when the source content is Portuguese.",
            prompts::build_system_prompt(request.system_prompt.as_deref())
        );
        let content = match self.chat_completion(&system, &user).await {
            Ok(c) => c,
            Err(_) => {
                let mut content = format!("# {}\n\n", title);
                if !request.transcript_lines.is_empty() {
                    content.push_str("## Transcrição\n");
                    for line in &request.transcript_lines {
                        content.push_str(&format!("- {line}\n"));
                    }
                }
                content
            }
        };
        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        Ok(DocumentGenerationResponse {
            title,
            content,
            content_left_device: !self.is_local,
            latency_ms,
        })
    }

    async fn request_translation(
        &self,
        request: TranslationRequest,
    ) -> ProviderResult<TranslationResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();
        let system = translation_system_prompt(
            &request.source_language,
            &request.target_language,
        );
        let user = translation_user_message(&request.text, request.context_hints.as_deref());

        let is_uncertain = request.text.len() < 3 || request.text.contains("???");
        let translated = self.chat_completion(&system, &user).await?;
        let confidence = if is_uncertain { 0.35 } else { 0.86 };

        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        Ok(TranslationResponse {
            text: translated,
            confidence,
            is_uncertain,
            uncertainty_notes: if is_uncertain {
                Some("low confidence translation".into())
            } else {
                None
            },
            content_left_device: !self.is_local,
            latency_ms,
        })
    }
}

impl OpenAiCompatibleAdapter {
    fn stub_guidance(&self, request: &GuidanceRequest) -> (String, f32, SuggestionType, bool) {
        let last = request.recent_transcript.last();
        let hint = request
            .session_context
            .company_or_product_notes
            .as_deref()
            .unwrap_or("");
        let (text, confidence, suggestion_type) = if let Some(seg) = last {
            if seg.confidence < 0.5 {
                (
                    "Peça esclarecimento antes de responder com detalhes específicos.".into(),
                    0.4,
                    SuggestionType::Fallback,
                )
            } else if seg.text.to_lowercase().contains("obje") {
                (
                    "Reconheça a preocupação, reformule o valor e proponha um próximo passo concreto."
                        .into(),
                    0.75,
                    SuggestionType::ObjectionResponse,
                )
            } else {
                (
                    format!(
                        "Responda de forma direta ao ponto: {}",
                        seg.text.chars().take(120).collect::<String>()
                    ),
                    0.82,
                    SuggestionType::Answer,
                )
            }
        } else {
            (
                "Prepare pontos de abertura alinhados ao objetivo da reunião.".into(),
                0.55,
                SuggestionType::TalkingPoint,
            )
        };
        let _ = hint;
        (text, confidence, suggestion_type, true)
    }
}

pub fn validate_configuration(
    base_url: Option<&str>,
    model: Option<&str>,
    api_key: Option<&str>,
    is_local: bool,
) -> ProviderResult<()> {
    if base_url.map(|u| u.is_empty()).unwrap_or(true) {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "base_url is required",
        ));
    }
    if model.map(|m| m.is_empty()).unwrap_or(true) {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "model is required",
        ));
    }
    if !is_local && api_key.map(|k| k.is_empty()).unwrap_or(true) {
        return Err(ProviderError::structured(
            ProviderErrorCode::AuthenticationFailed,
            "api key required for hosted openai-compatible provider",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chat_parse::parse_openai_completions_body;

    #[test]
    fn detects_openrouter_host() {
        assert!(is_openrouter_base("https://openrouter.ai/api/v1"));
        assert!(!is_openrouter_base("https://api.openai.com/v1"));
    }

    #[test]
    fn maps_402_to_authentication_failed() {
        let err = map_transcription_http_status(402, "OpenRouter", r#"{"error":{"code":402}}"#);
        match err {
            ProviderError::Structured { code, .. } => {
                assert_eq!(code, ProviderErrorCode::AuthenticationFailed);
            }
        }
    }

    #[test]
    fn openrouter_stt_model_defaults_to_whisper() {
        let adapter = OpenAiCompatibleAdapter::new(
            "https://openrouter.ai/api/v1",
            "meta-llama/llama-3.1-8b-instruct",
            Some("key".into()),
            false,
            "OpenRouter",
        );
        assert_eq!(adapter.openrouter_stt_model(), "openai/whisper-1");
    }

    #[test]
    fn parses_openai_style_completion() {
        let body = r#"{"choices":[{"message":{"role":"assistant","content":"2"}}]}"#;
        let text = parse_openai_completions_body(body, "meta/llama-3.1-70b").expect("parse");
        assert_eq!(text, "2");
    }

    #[test]
    fn rejects_model_echo() {
        let body = r#"{"choices":[{"message":{"content":"meta/llama-3.1-70b-instruct"}}]}"#;
        assert!(parse_openai_completions_body(body, "meta/llama-3.1-70b-instruct").is_err());
    }
}
