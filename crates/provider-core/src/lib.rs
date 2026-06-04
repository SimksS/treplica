pub mod chat_parse;
pub mod health;
pub mod hosted;
pub mod ollama;
pub mod openai_compatible;
pub mod prompts;
pub mod tasks;
pub mod transcription;
pub mod vision;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderKind {
    Ollama,
    Openai,
    Anthropic,
    Groq,
    Nvidia,
    OpenaiCompatible,
    Custom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderCapability {
    Chat,
    Streaming,
    Translation,
    Summarization,
    StructuredOutput,
    Transcription,
    Vision,
    Search,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMetadata {
    pub provider_kind: ProviderKind,
    pub display_name: String,
    pub is_local: bool,
    pub requires_credentials: bool,
    pub supports_streaming: bool,
    pub capabilities: Vec<ProviderCapability>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyMode {
    #[default]
    LocalOnly,
    HostedPerSession,
    HostedDefault,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SessionContextInput {
    pub role: Option<String>,
    pub objective: Option<String>,
    pub audience: Option<String>,
    pub company_or_product_notes: Option<String>,
    pub preferred_tone: Option<String>,
    pub forbidden_topics: Option<String>,
    /// User-defined system prompt (stored as custom_prompts in SQLite).
    pub system_prompt: Option<String>,
    pub assistant_preset_id: Option<String>,
    /// Optional briefing material supplied before the meeting (PDF, notes, etc.).
    pub pre_meeting_context: Option<String>,
    pub pre_meeting_context_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSnippet {
    pub speaker_label: Option<String>,
    pub text: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionType {
    Answer,
    ObjectionResponse,
    FollowUpQuestion,
    TalkingPoint,
    NextStep,
    Fallback,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatRole {
    User,
    Assistant,
}

/// One turn of the per-session guidance conversation (memory).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatTurn {
    pub role: ChatRole,
    pub content: String,
}

impl ChatTurn {
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: ChatRole::User, content: content.into() }
    }
    pub fn assistant(content: impl Into<String>) -> Self {
        Self { role: ChatRole::Assistant, content: content.into() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GuidanceRequest {
    pub session_context: SessionContextInput,
    pub recent_transcript: Vec<TranscriptSnippet>,
    pub suggestion_type: Option<SuggestionType>,
    pub privacy_mode: PrivacyMode,
    /// Page images (data URLs) from pre-meeting PDF/image attachments.
    #[serde(default)]
    pub context_image_data_urls: Vec<String>,
    /// Per-session conversation history (memory). When non-empty, the adapter sends
    /// `system + these turns` instead of a single stateless user prompt. The last
    /// turn is the current user ask and carries any context images.
    #[serde(default)]
    pub conversation: Vec<ChatTurn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationRequest {
    pub source_language: String,
    pub target_language: String,
    pub text: String,
    pub context_hints: Option<String>,
    pub privacy_mode: PrivacyMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionRequest {
    pub audio_bytes: Vec<u8>,
    pub file_name: String,
    pub mime_type: String,
    pub language: Option<String>,
    pub privacy_mode: PrivacyMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
    pub content_left_device: bool,
    pub latency_ms: u64,
    /// ISO-639-1 when the API reports detected language (`verbose_json`).
    pub detected_language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResponse {
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
    pub uncertainty_notes: Option<String>,
    pub content_left_device: bool,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentGenerationRequest {
    pub doc_type: String,
    pub session_title: String,
    pub transcript_lines: Vec<String>,
    pub suggestion_lines: Vec<String>,
    pub privacy_mode: PrivacyMode,
    #[serde(default)]
    pub system_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentGenerationResponse {
    pub title: String,
    pub content: String,
    pub content_left_device: bool,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceResponse {
    pub text: String,
    pub suggestion_type: SuggestionType,
    pub confidence: f32,
    pub grounding_summary: String,
    pub content_left_device: bool,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionRequest {
    pub session_context: SessionContextInput,
    pub recent_transcript: Vec<TranscriptSnippet>,
    pub image_data_url: String,
    pub privacy_mode: PrivacyMode,
    #[serde(default)]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionResponse {
    pub text: String,
    pub title: String,
    pub confidence: f32,
    pub grounding_summary: String,
    pub content_left_device: bool,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderErrorCode {
    InvalidConfiguration,
    AuthenticationFailed,
    RateLimited,
    ProviderUnavailable,
    ModelUnavailable,
    Timeout,
    UnsafeOutput,
    PrivacyBlocked,
    Unknown,
}

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("{code:?}: {message}")]
    Structured {
        code: ProviderErrorCode,
        message: String,
    },
}

impl ProviderError {
    pub fn structured(code: ProviderErrorCode, message: impl Into<String>) -> Self {
        Self::Structured {
            code,
            message: message.into(),
        }
    }
}

pub type ProviderResult<T> = Result<T, ProviderError>;

#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    fn metadata(&self) -> ProviderMetadata;
    async fn request_guidance(&self, request: GuidanceRequest) -> ProviderResult<GuidanceResponse>;
    async fn request_translation(
        &self,
        request: TranslationRequest,
    ) -> ProviderResult<TranslationResponse>;
    async fn request_transcription(
        &self,
        request: TranscriptionRequest,
    ) -> ProviderResult<TranscriptionResponse> {
        let _ = request;
        Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "transcription not supported by this provider",
        ))
    }
    async fn request_document_generation(
        &self,
        request: DocumentGenerationRequest,
    ) -> ProviderResult<DocumentGenerationResponse>;
    fn validate_privacy(&self, mode: PrivacyMode) -> ProviderResult<()> {
        if mode == PrivacyMode::LocalOnly && !self.metadata().is_local {
            return Err(ProviderError::structured(
                ProviderErrorCode::PrivacyBlocked,
                "hosted provider blocked in local-only mode",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ProviderCallMetadata {
    pub started_at: DateTime<Utc>,
    pub finished_at: DateTime<Utc>,
    pub content_left_device: bool,
    pub latency_ms: u64,
}
