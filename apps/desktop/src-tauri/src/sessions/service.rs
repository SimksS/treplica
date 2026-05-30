use chrono::Utc;
use local_store::models::SessionStatus;
use local_store::repositories::StoreRepositories;
use serde_json::json;

use crate::logging::audit::write_audit;

pub struct SessionService;

impl SessionService {
    pub fn create(
        repo: &StoreRepositories<'_>,
        title: &str,
    ) -> Result<local_store::models::Session, String> {
        repo.ensure_default_profile().map_err(|e| e.to_string())?;
        let session = repo.create_session(title).map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(&session.id),
            "session",
            "created",
            json!({ "title": title }),
            "info",
        )?;
        Ok(session)
    }

    pub fn start(
        repo: &StoreRepositories<'_>,
        session_id: &str,
    ) -> Result<local_store::models::Session, String> {
        let current = repo.get_session(session_id).map_err(|e| e.to_string())?;
        if current.status != SessionStatus::Draft {
            return Err(format!(
                "cannot start session: expected Draft state, found {:?}",
                current.status
            ));
        }
        let session = repo
            .update_session_status(session_id, SessionStatus::Listening, Some(Utc::now()), None)
            .map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(session_id),
            "session",
            "started",
            json!({}),
            "info",
        )?;
        Ok(session)
    }

    pub fn pause(
        repo: &StoreRepositories<'_>,
        session_id: &str,
    ) -> Result<local_store::models::Session, String> {
        let current = repo.get_session(session_id).map_err(|e| e.to_string())?;
        if !matches!(
            current.status,
            SessionStatus::Listening | SessionStatus::Reconnecting
        ) {
            return Err(format!(
                "cannot pause session: expected Listening or Reconnecting state, found {:?}",
                current.status
            ));
        }
        let session = repo
            .update_session_status(session_id, SessionStatus::Paused, None, None)
            .map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(session_id),
            "session",
            "paused",
            json!({}),
            "info",
        )?;
        Ok(session)
    }

    pub fn resume(
        repo: &StoreRepositories<'_>,
        session_id: &str,
    ) -> Result<local_store::models::Session, String> {
        let current = repo.get_session(session_id).map_err(|e| e.to_string())?;
        if current.status != SessionStatus::Paused {
            return Err(format!(
                "cannot resume session: expected Paused state, found {:?}",
                current.status
            ));
        }
        let session = repo
            .update_session_status(session_id, SessionStatus::Listening, None, None)
            .map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(session_id),
            "session",
            "resumed",
            json!({}),
            "info",
        )?;
        Ok(session)
    }

    pub fn end(
        repo: &StoreRepositories<'_>,
        session_id: &str,
    ) -> Result<local_store::models::Session, String> {
        let current = repo.get_session(session_id).map_err(|e| e.to_string())?;
        if matches!(
            current.status,
            SessionStatus::Ended | SessionStatus::Deleted | SessionStatus::Failed
        ) {
            return Err(format!(
                "cannot end session: already in terminal state {:?}",
                current.status
            ));
        }
        let session = repo
            .update_session_status(session_id, SessionStatus::Ended, None, Some(Utc::now()))
            .map_err(|e| e.to_string())?;
        write_audit(
            repo,
            Some(session_id),
            "session",
            "ended",
            json!({}),
            "info",
        )?;
        Ok(session)
    }

    /// Sessão ainda em andamento (mesmos critérios do filtro "Em andamento" no histórico).
    pub fn session_is_in_progress(status: SessionStatus) -> bool {
        matches!(
            status,
            SessionStatus::Listening
                | SessionStatus::Paused
                | SessionStatus::Reconnecting
                | SessionStatus::Draft
        )
    }
}
