use chrono::Utc;
use local_store::history_repository::{parse_document_type, HistoryRepository};
use local_store::models::{DocumentType, GeneratedDocument, ProviderCallRecord};
use local_store::repositories::StoreRepositories;
use provider_core::tasks::ModelTask;
use provider_core::DocumentGenerationRequest;
use uuid::Uuid;

use crate::documents::export::{remove_path_if_exists, write_document_export};
use crate::logging::audit::audit_document_generated;
use crate::providers::adapter;
use crate::providers::privacy::resolve_for_session;
use crate::providers::router::ResolvedProvider;
use crate::storage::AppState;
use std::path::Path;

pub struct PreparedDocumentGeneration {
    pub request: DocumentGenerationRequest,
    pub provider: ResolvedProvider,
}

pub struct DocumentService;

impl DocumentService {
    pub fn parse_doc_type(doc_type: &str) -> Result<DocumentType, String> {
        Ok(parse_document_type(doc_type.to_string()))
    }

    pub fn prepare_generation(
        state: &AppState,
        repo: &StoreRepositories<'_>,
        session_id: &str,
        doc_type: &str,
    ) -> Result<PreparedDocumentGeneration, String> {
        let provider =
            crate::providers::router::resolve_for_task(state, repo, ModelTask::Summarization)?;
        let history = HistoryRepository::new(repo.conn());
        let session = history.get_session(session_id).map_err(|e| e.to_string())?;
        let transcripts = history
            .list_transcripts(session_id)
            .map_err(|e| e.to_string())?;
        let suggestions = history
            .list_suggestions(session_id)
            .map_err(|e| e.to_string())?;
        let system_prompt = repo
            .get_session_context(session_id)
            .ok()
            .and_then(|ctx| ctx.custom_prompts.filter(|s| !s.trim().is_empty()));

        let transcript_lines: Vec<String> = transcripts
            .iter()
            .map(|t| {
                let speaker = t.speaker_label.as_deref().unwrap_or("?");
                format!("{speaker}: {}", t.text)
            })
            .collect();
        let suggestion_lines: Vec<String> = suggestions
            .iter()
            .map(|s| format!("{}: {}", suggestion_type_label(s.suggestion_type), s.text))
            .collect();

        let privacy_mode = resolve_for_session(repo, &session, &provider)?;

        Ok(PreparedDocumentGeneration {
            request: DocumentGenerationRequest {
                doc_type: doc_type.to_string(),
                session_title: session.title,
                transcript_lines,
                suggestion_lines,
                privacy_mode,
                system_prompt,
            },
            provider,
        })
    }

    pub async fn fetch_generation(
        prepared: &PreparedDocumentGeneration,
    ) -> Result<provider_core::DocumentGenerationResponse, String> {
        adapter::request_document_generation(&prepared.provider, prepared.request.clone())
            .await
            .map_err(|e| e.to_string())
    }

    pub fn persist_document(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        doc_type: DocumentType,
        prepared: &PreparedDocumentGeneration,
        response: provider_core::DocumentGenerationResponse,
        storage_path: Option<String>,
    ) -> Result<GeneratedDocument, String> {
        let now = Utc::now();
        let provider_id = prepared.provider.id.clone();
        let doc = GeneratedDocument {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            doc_type,
            title: response.title,
            content: response.content,
            format: "markdown".into(),
            storage_path,
            provider_id: Some(provider_id.clone()),
            created_at: now,
            updated_at: now,
        };
        HistoryRepository::new(repo.conn())
            .insert_document(&doc)
            .map_err(|e| e.to_string())?;

        let call = ProviderCallRecord {
            id: Uuid::new_v4().to_string(),
            session_id: Some(session_id.to_string()),
            provider_id: Some(provider_id),
            purpose: "document_generation".into(),
            local_or_hosted: if response.content_left_device {
                "hosted".into()
            } else {
                "local".into()
            },
            request_started_at: now,
            request_finished_at: Some(Utc::now()),
            status: "success".into(),
            latency_ms: Some(response.latency_ms as i64),
            error_code: None,
        };
        repo.insert_provider_call(&call)
            .map_err(|e| e.to_string())?;

        audit_document_generated(
            repo,
            session_id,
            &doc.id,
            doc_type_str(doc.doc_type),
            response.content_left_device,
        )?;

        Ok(doc)
    }

    pub fn export_to_disk(
        exports_root: &Path,
        doc: &GeneratedDocument,
    ) -> Result<(GeneratedDocument, crate::documents::export::ExportResult), String> {
        let result = write_document_export(exports_root, doc)?;
        Ok((doc.clone(), result))
    }

    pub fn delete_document(repo: &StoreRepositories<'_>, document_id: &str) -> Result<(), String> {
        let history = HistoryRepository::new(repo.conn());
        let path = history
            .delete_document(document_id)
            .map_err(|e| e.to_string())?;
        if let Some(p) = path {
            remove_path_if_exists(&p)?;
        }
        Ok(())
    }
}

fn suggestion_type_label(t: local_store::models::SuggestionType) -> &'static str {
    match t {
        local_store::models::SuggestionType::Answer => "answer",
        local_store::models::SuggestionType::ObjectionResponse => "objection",
        local_store::models::SuggestionType::FollowUpQuestion => "follow_up",
        local_store::models::SuggestionType::TalkingPoint => "talking_point",
        local_store::models::SuggestionType::NextStep => "next_step",
        local_store::models::SuggestionType::Fallback => "fallback",
    }
}

fn doc_type_str(t: DocumentType) -> &'static str {
    match t {
        DocumentType::Summary => "summary",
        DocumentType::FollowUpEmail => "follow_up_email",
        DocumentType::TranscriptExport => "transcript_export",
        DocumentType::ObjectionAnalysis => "objection_analysis",
        DocumentType::Notes => "notes",
        DocumentType::Custom => "custom",
    }
}
