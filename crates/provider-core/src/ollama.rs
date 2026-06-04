use std::sync::OnceLock;
use std::time::Duration;

use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::health::{validate_health_reply, HEALTH_CHECK_SYSTEM, HEALTH_CHECK_USER};
use crate::prompts::{self, parse_suggestion_type_hint};
use crate::vision::{build_vision_system_prompt, build_vision_user_prompt, parse_image_data_url};
use crate::{
    ChatRole, DocumentGenerationRequest, DocumentGenerationResponse, GuidanceRequest,
    GuidanceResponse, ProviderAdapter, ProviderCapability, ProviderError, ProviderErrorCode,
    ProviderKind, ProviderMetadata, ProviderResult, SuggestionType, TranslationRequest,
    TranslationResponse, VisionRequest, VisionResponse,
};

const DEFAULT_BASE_URL: &str = "http://127.0.0.1:11434";

fn shared_http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(120))
            .pool_max_idle_per_host(4)
            .build()
            .expect("ollama http client")
    })
}

pub struct OllamaAdapter {
    pub base_url: String,
    pub model: String,
}

impl Default for OllamaAdapter {
    fn default() -> Self {
        Self {
            base_url: DEFAULT_BASE_URL.into(),
            model: "llama3.2".into(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaTagEntry>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagEntry {
    name: String,
}

use crate::chat_parse::{is_model_echo, normalize_model_key};

/// Maps user-facing model labels (e.g. "llama 3.2") to an installed Ollama tag.
pub async fn resolve_model_tag(base_url: &str, configured: &str) -> String {
    let configured = configured.trim();
    if configured.is_empty() {
        return "llama3.2".into();
    }
    let target = normalize_model_key(configured);
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    if let Ok(resp) = shared_http_client()
        .get(&url)
        .timeout(Duration::from_secs(8))
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(tags) = resp.json::<OllamaTagsResponse>().await {
                for entry in &tags.models {
                    let key = normalize_model_key(&entry.name);
                    if key == target
                        || key.starts_with(&format!("{target}:"))
                        || target.starts_with(&format!("{key}:"))
                    {
                        return entry.name.clone();
                    }
                }
            }
        }
    }
    configured.replace(' ', "")
}

fn append_message_text(msg: &serde_json::Value, content: &mut String, thinking: &mut String) {
    if let Some(c) = msg.get("content") {
        match c {
            serde_json::Value::String(s) => content.push_str(s),
            serde_json::Value::Array(parts) => {
                for part in parts {
                    if let Some(t) = part.get("text").and_then(|v| v.as_str()) {
                        content.push_str(t);
                    }
                }
            }
            _ => {}
        }
    }
    if let Some(t) = msg.get("thinking").and_then(|v| v.as_str()) {
        thinking.push_str(t);
    }
}

fn extract_from_chat_value(value: &serde_json::Value, content: &mut String, thinking: &mut String) {
    if let Some(err) = value.get("error").and_then(|v| v.as_str()) {
        if !err.is_empty() {
            content.clear();
            thinking.clear();
            content.push_str("__OLLAMA_ERROR__:");
            content.push_str(err);
            return;
        }
    }
    if let Some(msg) = value.get("message") {
        append_message_text(msg, content, thinking);
    }
    if let Some(resp) = value.get("response").and_then(|v| v.as_str()) {
        content.push_str(resp);
    }
}

/// Parses Ollama `/api/chat` bodies (single JSON or NDJSON stream chunks).
pub fn parse_ollama_chat_body(body: &str, requested_model: &str) -> ProviderResult<String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            "ollama returned empty body",
        ));
    }

    let mut content = String::new();
    let mut thinking = String::new();
    let mut response_model: Option<String> = None;

    let lines: Vec<&str> = trimmed.lines().filter(|l| !l.trim().is_empty()).collect();
    if lines.len() > 1 {
        for line in lines {
            let value: serde_json::Value = serde_json::from_str(line).map_err(|e| {
                ProviderError::structured(
                    ProviderErrorCode::Unknown,
                    format!("invalid ollama NDJSON line: {e}"),
                )
            })?;
            if let Some(m) = value.get("model").and_then(|v| v.as_str()) {
                response_model = Some(m.to_string());
            }
            extract_from_chat_value(&value, &mut content, &mut thinking);
        }
    } else {
        let value: serde_json::Value = serde_json::from_str(trimmed).map_err(|e| {
            ProviderError::structured(
                ProviderErrorCode::Unknown,
                format!("invalid ollama response: {e}"),
            )
        })?;
        if let Some(m) = value.get("model").and_then(|v| v.as_str()) {
            response_model = Some(m.to_string());
        }
        extract_from_chat_value(&value, &mut content, &mut thinking);
    }

    if content.starts_with("__OLLAMA_ERROR__:") {
        let detail = content.trim_start_matches("__OLLAMA_ERROR__:");
        return Err(ProviderError::structured(
            ProviderErrorCode::ProviderUnavailable,
            detail.to_string(),
        ));
    }

    let text = if !content.trim().is_empty() {
        content.trim().to_string()
    } else if !thinking.trim().is_empty() {
        thinking.trim().to_string()
    } else {
        String::new()
    };

    if text.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            "ollama returned empty assistant content",
        ));
    }

    let model_ref = response_model.as_deref().unwrap_or(requested_model);
    if is_model_echo(&text, model_ref) || is_model_echo(&text, requested_model) {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            format!(
                "ollama echoed model name '{text}' instead of an answer; check model tag and Ollama logs"
            ),
        ));
    }

    Ok(text)
}

fn response_for_type(
    suggestion_type: SuggestionType,
    last: Option<&crate::TranscriptSnippet>,
    scenario_hint: &str,
) -> (String, f32, SuggestionType) {
    let snippet = last
        .map(|s| s.text.chars().take(80).collect::<String>())
        .unwrap_or_default();
    match suggestion_type {
        SuggestionType::Fallback => (
            "Peça esclarecimento antes de responder com detalhes específicos.".into(),
            0.4,
            SuggestionType::Fallback,
        ),
        SuggestionType::ObjectionResponse => (
            format!(
                "Reconheça a preocupação sobre \"{snippet}\", reformule o valor ({scenario_hint}) e proponha um próximo passo concreto."
            ),
            0.78,
            SuggestionType::ObjectionResponse,
        ),
        SuggestionType::FollowUpQuestion => (
            format!(
                "Pergunte: \"O que seria um resultado ideal para você em relação a {snippet}?\""
            ),
            0.8,
            SuggestionType::FollowUpQuestion,
        ),
        SuggestionType::NextStep => (
            "Sugira agendar uma demonstração ou enviar proposta com prazo e responsáveis definidos."
                .into(),
            0.77,
            SuggestionType::NextStep,
        ),
        SuggestionType::TalkingPoint => (
            format!("Ponto de conversa alinhado ao cenário: {scenario_hint}"),
            0.7,
            SuggestionType::TalkingPoint,
        ),
        SuggestionType::Answer => (
            format!("Responda de forma direta ao ponto: {snippet}"),
            0.82,
            SuggestionType::Answer,
        ),
    }
}

impl OllamaAdapter {
    pub fn new(base_url: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            model: model.into(),
        }
    }

    pub async fn ping(base_url: &str) -> ProviderResult<()> {
        Self::ping_with_timeout(base_url, Duration::from_secs(8)).await
    }

    /// Lightweight reachability check (Ollama daemon responding on `/api/tags`).
    pub async fn ping_with_timeout(base_url: &str, timeout: Duration) -> ProviderResult<()> {
        let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
        let resp = shared_http_client()
            .get(&url)
            .timeout(timeout)
            .send()
            .await
            .map_err(map_network)?;
        if !resp.status().is_success() {
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                format!("ollama returned HTTP {}", resp.status()),
            ));
        }
        Ok(())
    }

    /// Verifies Ollama is reachable and the configured model returns a real chat reply.
    pub async fn health_check(&self) -> ProviderResult<String> {
        Self::ping(&self.base_url).await?;
        let resolved = resolve_model_tag(&self.base_url, &self.model).await;
        let text = self
            .chat_completion(HEALTH_CHECK_SYSTEM, HEALTH_CHECK_USER)
            .await?;
        validate_health_reply(&text, &resolved)?;
        Ok(format!(
            "Ollama OK — modelo {resolved} respondeu: {}",
            health_preview(&text, 48)
        ))
    }

    async fn chat_completion(&self, system: &str, user: &str) -> ProviderResult<String> {
        let resolved_model = resolve_model_tag(&self.base_url, &self.model).await;
        let url = format!("{}/api/chat", self.base_url.trim_end_matches('/'));
        let body = json!({
            "model": resolved_model,
            "stream": false,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        });
        let resp = shared_http_client()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(map_network)?;
        if !resp.status().is_success() {
            let status = resp.status();
            let detail = resp.text().await.unwrap_or_default();
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                format!("ollama chat HTTP {status}: {detail}"),
            ));
        }
        let raw = resp.text().await.map_err(map_network)?;
        parse_ollama_chat_body(&raw, &resolved_model)
    }

    /// Posts a pre-built `messages` array (system + conversation history) and parses the reply.
    async fn complete_messages(
        &self,
        messages: Vec<serde_json::Value>,
    ) -> ProviderResult<String> {
        let resolved_model = resolve_model_tag(&self.base_url, &self.model).await;
        let url = format!("{}/api/chat", self.base_url.trim_end_matches('/'));
        let body = json!({
            "model": resolved_model,
            "stream": false,
            "options": {"num_predict": prompts::GUIDANCE_MAX_TOKENS},
            "messages": messages,
        });
        let resp = shared_http_client()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(map_network)?;
        if !resp.status().is_success() {
            let status = resp.status();
            let detail = resp.text().await.unwrap_or_default();
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                format!("ollama chat HTTP {status}: {detail}"),
            ));
        }
        let raw = resp.text().await.map_err(map_network)?;
        parse_ollama_chat_body(&raw, &resolved_model)
    }

    pub async fn analyze_image(&self, request: VisionRequest) -> ProviderResult<VisionResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();
        let parsed = parse_image_data_url(&request.image_data_url)?;
        let resolved_model = resolve_model_tag(&self.base_url, &self.model).await;
        let system = build_vision_system_prompt(request.session_context.system_prompt.as_deref());
        let user = build_vision_user_prompt(
            &request.session_context,
            &request.recent_transcript,
            request.source.as_deref(),
        );
        let url = format!("{}/api/chat", self.base_url.trim_end_matches('/'));
        let body = json!({
            "model": resolved_model,
            "stream": false,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user, "images": [parsed.base64_payload]},
            ],
        });
        let resp = shared_http_client()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(map_network)?;
        if !resp.status().is_success() {
            let status = resp.status();
            let detail = resp.text().await.unwrap_or_default();
            return Err(ProviderError::structured(
                ProviderErrorCode::ProviderUnavailable,
                format!("ollama vision HTTP {status}: {detail}"),
            ));
        }
        let raw = resp.text().await.map_err(map_network)?;
        let text = parse_ollama_chat_body(&raw, &resolved_model)?;
        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        let title = vision_title_from(&text);
        Ok(VisionResponse {
            text: text.clone(),
            title,
            confidence: 0.84,
            grounding_summary: format!(
                "análise visual Ollama ({resolved_model}); {} trechos",
                request.recent_transcript.len()
            ),
            content_left_device: true,
            latency_ms,
        })
    }

    fn stub_guidance(&self, request: &GuidanceRequest) -> (String, f32, SuggestionType, bool) {
        let last = request.recent_transcript.last();
        let hint = request
            .session_context
            .company_or_product_notes
            .as_deref()
            .unwrap_or("");
        let (text, confidence, suggestion_type) = if let Some(forced) = request.suggestion_type {
            response_for_type(forced, last, hint)
        } else if let Some(seg) = last {
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
                        "Responda de forma direta usando o contexto: {}",
                        seg.text.chars().take(80).collect::<String>()
                    ),
                    0.82,
                    SuggestionType::Answer,
                )
            }
        } else {
            (
                "Prepare pontos de abertura alinhados ao seu objetivo na reunião.".into(),
                0.55,
                SuggestionType::TalkingPoint,
            )
        };
        (text, confidence, suggestion_type, true)
    }
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

fn map_network(err: reqwest::Error) -> ProviderError {
    ProviderError::structured(
        ProviderErrorCode::ProviderUnavailable,
        format!("ollama request failed: {err}"),
    )
}

/// Builds the Ollama chat `messages` array for a guidance request: a system message
/// followed by the per-session conversation (memory). Context images are attached to
/// the current (last) user turn. Falls back to a single stateless user prompt when no
/// conversation memory is present.
fn ollama_guidance_messages(
    system: &str,
    request: &GuidanceRequest,
) -> ProviderResult<Vec<serde_json::Value>> {
    let mut messages = vec![json!({"role": "system", "content": system})];
    let images = &request.context_image_data_urls;

    if request.conversation.is_empty() {
        let user = prompts::build_user_prompt(request);
        messages.push(ollama_user_message(&user, images)?);
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
                    messages.push(ollama_user_message(&turn.content, images)?);
                } else {
                    messages.push(json!({"role": "user", "content": turn.content}));
                }
            }
        }
    }
    Ok(messages)
}

/// A user message; attaches base64 images (Ollama format) when supplied.
fn ollama_user_message(text: &str, images: &[String]) -> ProviderResult<serde_json::Value> {
    if images.is_empty() {
        return Ok(json!({"role": "user", "content": text}));
    }
    let encoded: Result<Vec<String>, ProviderError> = images
        .iter()
        .map(|url| parse_image_data_url(url).map(|p| p.base64_payload))
        .collect();
    Ok(json!({"role": "user", "content": text, "images": encoded?}))
}

#[async_trait]
impl ProviderAdapter for OllamaAdapter {
    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata {
            provider_kind: ProviderKind::Ollama,
            display_name: "Ollama (local)".into(),
            is_local: true,
            requires_credentials: false,
            supports_streaming: true,
            capabilities: vec![
                ProviderCapability::Chat,
                ProviderCapability::Streaming,
                ProviderCapability::Translation,
                ProviderCapability::Summarization,
                ProviderCapability::Vision,
            ],
        }
    }

    async fn request_guidance(&self, request: GuidanceRequest) -> ProviderResult<GuidanceResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();
        let system = prompts::build_system_prompt(request.session_context.system_prompt.as_deref());
        let fallback_type = request
            .suggestion_type
            .unwrap_or(SuggestionType::Answer);

        let completion = match ollama_guidance_messages(&system, &request) {
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
                        "\n\n_(Fallback local: Ollama indisponível em {} — {err})_",
                        self.base_url
                    ));
                    (text, confidence, suggestion_type, true)
                }
            };

        let finished = Utc::now();
        let latency_ms = (finished - started).num_milliseconds().max(1) as u64;

        Ok(GuidanceResponse {
            text,
            suggestion_type,
            confidence,
            grounding_summary: format!(
                "orientação ao vivo (stub={used_stub}); {} trechos recentes",
                request.recent_transcript.len(),
            ),
            content_left_device: false,
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
                    content.push('\n');
                }
                if !request.suggestion_lines.is_empty() {
                    content.push_str("## Orientações\n");
                    for line in &request.suggestion_lines {
                        content.push_str(&format!("- {line}\n"));
                    }
                }
                if request.transcript_lines.is_empty() && request.suggestion_lines.is_empty() {
                    content.push_str("_Sem conteúdo de sessão para resumir._\n");
                }
                content
            }
        };
        let latency_ms = (Utc::now() - started).num_milliseconds().max(1) as u64;
        Ok(DocumentGenerationResponse {
            title,
            content,
            content_left_device: false,
            latency_ms,
        })
    }

    async fn request_translation(
        &self,
        request: TranslationRequest,
    ) -> ProviderResult<TranslationResponse> {
        self.validate_privacy(request.privacy_mode)?;
        let started = Utc::now();

        let system = crate::transcription::translation_system_prompt(
            &request.source_language,
            &request.target_language,
        );
        let user = crate::transcription::translation_user_message(&request.text, request.context_hints.as_deref());

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
            content_left_device: false,
            latency_ms,
        })
    }
}

#[cfg(test)]
mod parse_tests {
    use super::*;

    #[test]
    fn parses_single_chat_message() {
        let body = r#"{"model":"llama3.2","message":{"role":"assistant","content":"2"}}"#;
        let text = parse_ollama_chat_body(body, "llama3.2").expect("parse");
        assert_eq!(text, "2");
    }

    #[test]
    fn aggregates_ndjson_stream_chunks() {
        let body = r#"{"model":"llama3.2","message":{"role":"assistant","content":"2"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}"#;
        let text = parse_ollama_chat_body(body, "llama3.2").expect("parse");
        assert_eq!(text, "2");
    }

    #[test]
    fn rejects_model_name_echo_as_content() {
        let body = r#"{"model":"llama3.2","message":{"role":"assistant","content":"llama3.2"}}"#;
        assert!(parse_ollama_chat_body(body, "llama3.2").is_err());
    }

    #[test]
    fn resolves_spaced_model_key() {
        assert_eq!(crate::chat_parse::normalize_model_key("llama 3.2"), "llama3.2");
    }

    #[tokio::test]
    async fn ping_fails_when_server_not_listening() {
        let err = OllamaAdapter::ping_with_timeout(
            "http://127.0.0.1:1",
            Duration::from_millis(400),
        )
        .await;
        assert!(err.is_err());
    }
}

pub fn validate_configuration(base_url: Option<&str>, model: Option<&str>) -> ProviderResult<()> {
    if base_url.map(|u| u.is_empty()).unwrap_or(true) {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "ollama base_url is required",
        ));
    }
    if model.map(|m| m.is_empty()).unwrap_or(true) {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "ollama model is required",
        ));
    }
    Ok(())
}
