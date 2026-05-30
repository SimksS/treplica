use local_store::repositories::StoreRepositories;
use serde_json::json;

use crate::logging::audit::write_audit;

pub struct SuggestionActions;

impl SuggestionActions {
    pub fn copy(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        suggestion_id: &str,
    ) -> Result<(), String> {
        repo.mark_suggestion_copied(suggestion_id)
            .map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(session_id),
            "session",
            "suggestion_copied",
            json!({ "suggestion_id": suggestion_id }),
            "info",
        )?;
        Ok(())
    }

    pub fn save(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        suggestion_id: &str,
    ) -> Result<(), String> {
        repo.mark_suggestion_saved(suggestion_id)
            .map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(session_id),
            "session",
            "suggestion_saved",
            json!({ "suggestion_id": suggestion_id }),
            "info",
        )?;
        Ok(())
    }
}
