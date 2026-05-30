use std::path::Path;

use local_store::history_repository::HistoryRepository;
use local_store::repositories::StoreRepositories;
use uuid::Uuid;

use crate::documents::export::{remove_path_if_exists, remove_session_export_dir};
use crate::logging::audit::audit_session_deleted;

pub struct DeletionService;

impl DeletionService {
    pub fn delete_session(
        repo: &StoreRepositories<'_>,
        exports_root: &Path,
        session_id: &str,
    ) -> Result<(), String> {
        let history = HistoryRepository::new(repo.conn());
        let docs = history
            .list_documents(session_id)
            .map_err(|e| e.to_string())?;
        for doc in &docs {
            if let Some(ref path) = doc.storage_path {
                remove_path_if_exists(path)?;
            }
        }
        remove_session_export_dir(exports_root, session_id)?;

        history
            .delete_session_row(session_id)
            .map_err(|e| e.to_string())?;

        let request_id = Uuid::new_v4().to_string();
        history
            .insert_deletion_request(&request_id, "session", session_id, "completed", None)
            .map_err(|e| e.to_string())?;

        audit_session_deleted(repo, session_id)?;
        Ok(())
    }
}
