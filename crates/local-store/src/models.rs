use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyMode {
    LocalOnly,
    HostedPerSession,
    HostedDefault,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Draft,
    Listening,
    Paused,
    Reconnecting,
    Ended,
    Failed,
    Deleted,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiProviderConfiguration {
    pub id: String,
    pub provider_kind: String,
    pub display_name: String,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub capabilities_json: String,
    pub credential_ref: Option<String>,
    pub enabled: bool,
    pub local_only: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub display_name: Option<String>,
    pub default_language: String,
    pub default_provider_id: Option<String>,
    pub privacy_mode: PrivacyMode,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub status: SessionStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
    pub source_language: String,
    pub target_language: Option<String>,
    pub stealth_mode_enabled: bool,
    pub provider_id: Option<String>,
    pub storage_path: Option<String>,
    /// User confirmed sending meeting data to hosted providers this session.
    pub hosted_data_acknowledged: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionContext {
    pub id: String,
    pub session_id: String,
    pub role: Option<String>,
    pub objective: Option<String>,
    pub audience: Option<String>,
    pub company_or_product_notes: Option<String>,
    pub custom_prompts: Option<String>,
    pub assistant_preset_id: Option<String>,
    pub preferred_tone: Option<String>,
    pub forbidden_topics: Option<String>,
    pub pre_meeting_context: Option<String>,
    pub pre_meeting_context_source: Option<String>,
    /// JSON array of relative paths to page images for vision context.
    pub pre_meeting_attachment_pages: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationSegment {
    pub id: String,
    pub session_id: String,
    pub transcript_segment_id: String,
    pub source_language: String,
    pub target_language: String,
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
    pub provider_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub id: String,
    pub session_id: String,
    pub speaker_label: Option<String>,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub language: String,
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
    pub source: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceSuggestion {
    pub id: String,
    pub session_id: String,
    pub trigger_segment_ids: Vec<String>,
    pub suggestion_type: SuggestionType,
    pub text: String,
    pub rationale: Option<String>,
    pub confidence: f32,
    pub provider_id: Option<String>,
    pub shown_at: Option<DateTime<Utc>>,
    pub copied_at: Option<DateTime<Utc>>,
    pub saved: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub session_id: Option<String>,
    pub category: String,
    pub action: String,
    pub details_json: String,
    pub severity: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentType {
    Summary,
    FollowUpEmail,
    TranscriptExport,
    ObjectionAnalysis,
    Notes,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedDocument {
    pub id: String,
    pub session_id: String,
    pub doc_type: DocumentType,
    pub title: String,
    pub content: String,
    pub format: String,
    pub storage_path: Option<String>,
    pub provider_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHistoryItem {
    pub id: String,
    pub title: String,
    pub status: SessionStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
    pub transcript_count: i64,
    pub suggestion_count: i64,
    pub document_count: i64,
    pub created_at: DateTime<Utc>,
    pub assistant_preset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCallRecord {
    pub id: String,
    pub session_id: Option<String>,
    pub provider_id: Option<String>,
    pub purpose: String,
    pub local_or_hosted: String,
    pub request_started_at: DateTime<Utc>,
    pub request_finished_at: Option<DateTime<Utc>>,
    pub status: String,
    pub latency_ms: Option<i64>,
    pub error_code: Option<String>,
}
