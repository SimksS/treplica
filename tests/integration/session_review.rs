use local_store::database::open_in_memory;
use local_store::history_repository::HistoryRepository;
use local_store::models::{GuidanceSuggestion, SessionStatus, SuggestionType, TranscriptSegment};
use local_store::repositories::StoreRepositories;
use std::fs;
use uuid::Uuid;
use chrono::Utc;

#[test]
fn history_list_generate_export_and_delete_flow() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    let history = HistoryRepository::new(&conn);

    let session = repo.create_session("Review flow").expect("session");
    repo.update_session_status(&session.id, SessionStatus::Ended, Some(Utc::now()), Some(Utc::now()))
        .expect("ended");

    let transcript = TranscriptSegment {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        speaker_label: None,
        started_at_ms: 0,
        ended_at_ms: 1000,
        language: "pt-BR".into(),
        text: "Obrigado pela reunião".into(),
        confidence: 0.9,
        is_uncertain: false,
        source: "simulated".into(),
        created_at: Utc::now(),
    };
    repo.insert_transcript(&transcript).expect("transcript");

    let suggestion = GuidanceSuggestion {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        trigger_segment_ids: vec![],
        suggestion_type: SuggestionType::NextStep,
        text: "Enviar proposta".into(),
        rationale: None,
        confidence: 0.8,
        provider_id: None,
        shown_at: None,
        copied_at: None,
        saved: false,
        created_at: Utc::now(),
    };
    repo.insert_suggestion(&suggestion).expect("suggestion");

    let list = history.list_sessions(None, None, None, 10).expect("list");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].transcript_count, 1);

    let detail_transcripts = history.list_transcripts(&session.id).expect("detail");
    assert_eq!(detail_transcripts.len(), 1);

    let temp = tempfile::tempdir().expect("temp");
    let export_root = temp.path();
    let doc = local_store::models::GeneratedDocument {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        doc_type: local_store::models::DocumentType::Summary,
        title: "Resumo".into(),
        content: "# Resumo\n\nPontos principais.".into(),
        format: "markdown".into(),
        storage_path: None,
        provider_id: Some("ollama-local".into()),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    history.insert_document(&doc).expect("doc");

    let session_dir = export_root.join(&session.id);
    fs::create_dir_all(&session_dir).expect("dir");
    let export_file = session_dir.join("summary.md");
    fs::write(&export_file, &doc.content).expect("export");

    history
        .update_document_storage_path(&doc.id, &export_file.to_string_lossy())
        .expect("path");

    let audits_before = history.list_audit(&session.id).unwrap_or_default();
    let _ = audits_before;

    history.delete_session_row(&session.id).expect("delete");
    assert!(history
        .list_sessions(None, None, None, 10)
        .expect("list")
        .is_empty());
    assert!(history.get_session(&session.id).is_err());
}
