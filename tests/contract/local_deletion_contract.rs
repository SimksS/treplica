use local_store::database::open_in_memory;
use local_store::history_repository::HistoryRepository;
use local_store::models::{DocumentType, GeneratedDocument};
use local_store::repositories::StoreRepositories;
use std::fs;
use uuid::Uuid;
use chrono::Utc;

#[test]
fn session_deletion_removes_documents_and_export_files() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    let session = repo.create_session("Delete me").expect("session");
    let history = HistoryRepository::new(&conn);

    let temp = tempfile::tempdir().expect("tempdir");
    let export_dir = temp.path().join(&session.id);
    fs::create_dir_all(&export_dir).expect("mkdir");
    let file_path = export_dir.join("summary-test.md");
    fs::write(&file_path, "# test").expect("write");

    let doc = GeneratedDocument {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        doc_type: DocumentType::Summary,
        title: "Resumo".into(),
        content: "Conteúdo".into(),
        format: "markdown".into(),
        storage_path: Some(file_path.to_string_lossy().to_string()),
        provider_id: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    history.insert_document(&doc).expect("insert");

    let removed_path = history.delete_document(&doc.id).expect("delete doc");
    assert_eq!(removed_path.as_deref(), Some(file_path.to_str().unwrap()));
    fs::remove_file(&file_path).expect("cleanup file");
    fs::remove_dir_all(&export_dir).expect("cleanup dir");
    history
        .delete_session_row(&session.id)
        .expect("delete session");

    assert!(history.get_session(&session.id).is_err());
    assert!(history.list_documents(&session.id).unwrap_or_default().is_empty());
}
