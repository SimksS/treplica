use crate::commands::context_commands::{context_dto, SessionContextDto};
use crate::commands::session_dto::suggestion_type_name;
use crate::commands::CommandResponse;
use crate::documents::service::DocumentService;
use crate::logging::performance::{PerfSpan, PerformanceMetric};
use crate::storage::deletion::DeletionService;
use crate::storage::AppState;
use local_store::history_repository::HistoryRepository;
use local_store::models::{DocumentType, SessionStatus};
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct SessionHistoryItemDto {
    pub id: String,
    pub title: String,
    pub status: String,
    pub transcript_count: i64,
    pub suggestion_count: i64,
    pub document_count: i64,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub assistant_preset_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TranscriptDetailDto {
    pub id: String,
    pub speaker_label: Option<String>,
    pub text: String,
    pub is_uncertain: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct SuggestionDetailDto {
    pub id: String,
    pub text: String,
    pub suggestion_type: String,
    pub confidence: f32,
    pub rationale: Option<String>,
    pub saved: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TranslationDetailDto {
    pub id: String,
    pub transcript_segment_id: String,
    pub source_language: String,
    pub target_language: String,
    pub text: String,
    pub is_uncertain: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ProviderCallDto {
    pub id: String,
    pub purpose: String,
    pub status: String,
    pub local_or_hosted: String,
}

#[derive(Debug, Serialize)]
pub struct AuditEventDto {
    pub id: String,
    pub category: String,
    pub action: String,
    pub severity: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct GeneratedDocumentDto {
    pub id: String,
    pub session_id: String,
    pub doc_type: String,
    pub title: String,
    pub content: String,
    pub format: String,
    pub storage_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct SessionDetailDto {
    pub session: SessionHistoryItemDto,
    pub context: Option<SessionContextDto>,
    pub transcripts: Vec<TranscriptDetailDto>,
    pub translations: Vec<TranslationDetailDto>,
    pub suggestions: Vec<SuggestionDetailDto>,
    pub provider_calls: Vec<ProviderCallDto>,
    pub documents: Vec<GeneratedDocumentDto>,
    pub audit_events: Vec<AuditEventDto>,
}

#[derive(Debug, Serialize)]
pub struct ExportDocumentResultDto {
    pub path: String,
    pub format: String,
    pub exported_at: String,
}

fn status_str(s: SessionStatus) -> String {
    match s {
        SessionStatus::Draft => "draft".into(),
        SessionStatus::Listening => "listening".into(),
        SessionStatus::Paused => "paused".into(),
        SessionStatus::Reconnecting => "reconnecting".into(),
        SessionStatus::Ended => "ended".into(),
        SessionStatus::Failed => "failed".into(),
        SessionStatus::Deleted => "deleted".into(),
    }
}

fn doc_type_str(t: DocumentType) -> String {
    match t {
        DocumentType::Summary => "summary".into(),
        DocumentType::FollowUpEmail => "follow_up_email".into(),
        DocumentType::TranscriptExport => "transcript_export".into(),
        DocumentType::ObjectionAnalysis => "objection_analysis".into(),
        DocumentType::Notes => "notes".into(),
        DocumentType::Custom => "custom".into(),
    }
}

fn map_document(d: local_store::models::GeneratedDocument) -> GeneratedDocumentDto {
    GeneratedDocumentDto {
        id: d.id,
        session_id: d.session_id,
        doc_type: doc_type_str(d.doc_type),
        title: d.title,
        content: d.content,
        format: d.format,
        storage_path: d.storage_path,
        created_at: d.created_at.to_rfc3339(),
    }
}

fn map_history_item_dto(s: local_store::models::SessionHistoryItem) -> SessionHistoryItemDto {
    SessionHistoryItemDto {
        id: s.id,
        title: s.title,
        status: status_str(s.status),
        transcript_count: s.transcript_count,
        suggestion_count: s.suggestion_count,
        document_count: s.document_count,
        started_at: s.started_at.map(|t| t.to_rfc3339()),
        ended_at: s.ended_at.map(|t| t.to_rfc3339()),
        assistant_preset_id: s.assistant_preset_id,
    }
}

#[tauri::command]
pub fn list_session_history(
    state: State<'_, AppState>,
    query: Option<String>,
    status_filter: Option<String>,
    assistant_preset_filter: Option<String>,
    limit: Option<usize>,
) -> Result<CommandResponse<Vec<SessionHistoryItemDto>>, ()> {
    let limit = limit.unwrap_or(50).min(200);
    let filter = status_filter
        .as_deref()
        .filter(|f| !f.is_empty() && *f != "all");
    let assistant_filter = assistant_preset_filter
        .as_deref()
        .filter(|f| !f.is_empty() && *f != "all");
    let perf = PerfSpan::start(PerformanceMetric::LocalSearch, None);
    match state.with_repo(|repo| {
        let history = HistoryRepository::new(repo.conn());
        let items = history.list_sessions(
            query.as_deref(),
            filter,
            assistant_filter,
            limit,
        )?;
        let list = items
            .into_iter()
            .map(map_history_item_dto)
            .collect::<Vec<_>>();
        perf.finish(repo);
        Ok(list)
    }) {
        Ok(list) => Ok(CommandResponse::success(list)),
        Err(e) => Ok(CommandResponse::failure("history_error", e)),
    }
}

#[tauri::command]
pub fn rename_session(
    state: State<'_, AppState>,
    session_id: String,
    title: String,
) -> Result<CommandResponse<SessionHistoryItemDto>, ()> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Ok(CommandResponse::failure(
            "invalid_title",
            "O título não pode ficar vazio.",
        ));
    }
    if trimmed.len() > 200 {
        return Ok(CommandResponse::failure(
            "invalid_title",
            "O título deve ter no máximo 200 caracteres.",
        ));
    }
    match state.with_repo(|repo| {
        let history = HistoryRepository::new(repo.conn());
        let updated = history.update_session_title(&session_id, trimmed)?;
        Ok(map_history_item_dto(updated))
    }) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("history_error", e)),
    }
}

#[tauri::command]
pub fn get_session_detail(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<SessionDetailDto>, ()> {
    match state.with_repo(|repo| {
        let history = HistoryRepository::new(repo.conn());
        let session = history.get_session(&session_id)?;
        let ctx = history.get_context(&session_id).ok();
        let transcripts = history.list_transcripts(&session_id)?;
        let translations = history.list_translations(&session_id)?;
        let suggestions = history.list_suggestions(&session_id)?;
        let provider_calls = history.list_provider_calls(&session_id)?;
        let documents = history.list_documents(&session_id)?;
        let audits = history.list_audit(&session_id)?;

        Ok(SessionDetailDto {
            session: SessionHistoryItemDto {
                id: session.id.clone(),
                title: session.title,
                status: status_str(session.status),
                transcript_count: transcripts.len() as i64,
                suggestion_count: suggestions.len() as i64,
                document_count: documents.len() as i64,
                started_at: session.started_at.map(|t| t.to_rfc3339()),
                ended_at: session.ended_at.map(|t| t.to_rfc3339()),
                assistant_preset_id: ctx.as_ref().and_then(|c| c.assistant_preset_id.clone()),
            },
            context: ctx.map(context_dto),
            transcripts: transcripts
                .into_iter()
                .map(|t| TranscriptDetailDto {
                    id: t.id,
                    speaker_label: t.speaker_label,
                    text: t.text,
                    is_uncertain: t.is_uncertain,
                    created_at: t.created_at.to_rfc3339(),
                })
                .collect(),
            translations: translations
                .into_iter()
                .map(|t| TranslationDetailDto {
                    id: t.id,
                    transcript_segment_id: t.transcript_segment_id,
                    source_language: t.source_language,
                    target_language: t.target_language,
                    text: t.text,
                    is_uncertain: t.is_uncertain,
                    created_at: t.created_at.to_rfc3339(),
                })
                .collect(),
            suggestions: suggestions
                .into_iter()
                .map(|s| SuggestionDetailDto {
                    id: s.id,
                    text: s.text,
                    suggestion_type: suggestion_type_name(s.suggestion_type),
                    confidence: s.confidence,
                    rationale: s.rationale,
                    saved: s.saved,
                    created_at: s.created_at.to_rfc3339(),
                })
                .collect(),
            provider_calls: provider_calls
                .into_iter()
                .map(|c| ProviderCallDto {
                    id: c.id,
                    purpose: c.purpose,
                    status: c.status,
                    local_or_hosted: c.local_or_hosted,
                })
                .collect(),
            documents: documents.into_iter().map(map_document).collect(),
            audit_events: audits
                .into_iter()
                .map(|a| AuditEventDto {
                    id: a.id,
                    category: a.category,
                    action: a.action,
                    severity: a.severity,
                    created_at: a.created_at.to_rfc3339(),
                })
                .collect(),
        })
    }) {
        Ok(detail) => Ok(CommandResponse::success(detail)),
        Err(e) => Ok(CommandResponse::failure("history_error", e)),
    }
}

#[tauri::command]
pub async fn generate_session_document(
    state: State<'_, AppState>,
    session_id: String,
    doc_type: String,
) -> Result<CommandResponse<GeneratedDocumentDto>, ()> {
    let prepared = match state.with_repo_str(|repo| {
        DocumentService::prepare_generation(&state, repo, &session_id, &doc_type)
    }) {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("document_error", e)),
    };

    let parsed_type = match DocumentService::parse_doc_type(&doc_type) {
        Ok(t) => t,
        Err(e) => return Ok(CommandResponse::failure("document_error", e)),
    };

    let response = match DocumentService::fetch_generation(&prepared).await {
        Ok(r) => r,
        Err(e) => return Ok(CommandResponse::failure("document_error", e)),
    };

    let exports_root = match state.exports_root() {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("document_error", e)),
    };
    let doc = match state.with_repo_str(|repo| {
        DocumentService::persist_document(repo, &session_id, parsed_type, &prepared, response, None)
    }) {
        Ok(d) => d,
        Err(e) => return Ok(CommandResponse::failure("document_error", e)),
    };
    let path_str = match DocumentService::export_to_disk(&exports_root, &doc) {
        Ok((_, export)) => export.path.to_string_lossy().to_string(),
        Err(e) => return Ok(CommandResponse::failure("document_error", e)),
    };
    match state.with_repo(|repo| {
        HistoryRepository::new(repo.conn()).update_document_storage_path(&doc.id, &path_str)?;
        let updated = HistoryRepository::new(repo.conn()).get_document(&doc.id)?;
        Ok(map_document(updated))
    }) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("document_error", e)),
    }
}

#[tauri::command]
pub fn export_session_document(
    state: State<'_, AppState>,
    document_id: String,
) -> Result<CommandResponse<ExportDocumentResultDto>, ()> {
    let exports_root = match state.exports_root() {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("export_error", e)),
    };
    match state.with_repo_str(|repo| {
        let history = HistoryRepository::new(repo.conn());
        let doc = history
            .get_document(&document_id)
            .map_err(|e| e.to_string())?;
        let (_, export) = DocumentService::export_to_disk(&exports_root, &doc)?;
        Ok(ExportDocumentResultDto {
            path: export.path.to_string_lossy().to_string(),
            format: export.format,
            exported_at: export.exported_at,
        })
    }) {
        Ok(r) => Ok(CommandResponse::success(r)),
        Err(e) => Ok(CommandResponse::failure("export_error", e)),
    }
}

#[tauri::command]
pub fn delete_generated_document(
    state: State<'_, AppState>,
    document_id: String,
) -> Result<CommandResponse<()>, ()> {
    match state.with_repo_str(|repo| DocumentService::delete_document(repo, &document_id)) {
        Ok(()) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::failure("document_error", e)),
    }
}

#[tauri::command]
pub fn delete_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CommandResponse<()>, ()> {
    let exports_root = match state.exports_root() {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("deletion_error", e)),
    };
    match state
        .with_repo_str(|repo| DeletionService::delete_session(repo, &exports_root, &session_id))
    {
        Ok(()) => {}
        Err(e) => return Ok(CommandResponse::failure("deletion_error", e)),
    }
    state.live_listeners.stop(&session_id);
    if let Ok(mut sims) = state.simulators.lock() {
        sims.remove(&session_id);
    }
    Ok(CommandResponse::success(()))
}
