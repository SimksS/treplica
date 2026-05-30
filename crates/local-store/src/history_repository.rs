use chrono::Utc;
use rusqlite::{params, Connection};

use crate::models::{
    AuditLogEntry, GeneratedDocument, GuidanceSuggestion, ProviderCallRecord, Session,
    SessionContext, SessionHistoryItem, SessionStatus, TranscriptSegment, TranslationSegment,
};
use crate::translation_repository::TranslationRepository;
use crate::DatabaseError;

pub struct HistoryRepository<'a> {
    conn: &'a Connection,
}

impl<'a> HistoryRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn list_sessions(
        &self,
        query: Option<&str>,
        status_filter: Option<&str>,
        assistant_preset_filter: Option<&str>,
        limit: usize,
    ) -> Result<Vec<SessionHistoryItem>, DatabaseError> {
        let search = query.and_then(|q| {
            let trimmed = q.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(format!("%{trimmed}%"))
            }
        });

        let mut where_clauses = vec!["s.status != 'deleted'".to_string()];
        let mut preset_bind: Option<String> = None;

        if search.is_some() {
            where_clauses.push("(s.title LIKE ? OR s.id LIKE ?)".to_string());
        }
        if let Some(filter) = status_filter {
            match filter {
                "ended" => where_clauses.push("s.status = 'ended'".to_string()),
                "active" => where_clauses.push(
                    "s.status IN ('listening', 'paused', 'reconnecting', 'draft')".to_string(),
                ),
                "failed" => where_clauses.push("s.status = 'failed'".to_string()),
                _ => {}
            }
        }
        if let Some(preset) = assistant_preset_filter {
            match preset {
                "unset" | "_none" => where_clauses.push(
                    "(c.assistant_preset_id IS NULL OR TRIM(c.assistant_preset_id) = '')"
                        .to_string(),
                ),
                _ => {
                    where_clauses.push("c.assistant_preset_id = ?".to_string());
                    preset_bind = Some(preset.to_string());
                }
            }
        }

        let mut sql = String::from(
            "SELECT s.id, s.title, s.status, s.started_at, s.ended_at, s.created_at,
             (SELECT COUNT(*) FROM transcript_segments t WHERE t.session_id = s.id) AS transcript_count,
             (SELECT COUNT(*) FROM guidance_suggestions g WHERE g.session_id = s.id) AS suggestion_count,
             (SELECT COUNT(*) FROM generated_documents d WHERE d.session_id = s.id) AS document_count,
             c.assistant_preset_id
             FROM sessions s
             LEFT JOIN session_contexts c ON c.session_id = s.id
             WHERE ",
        );
        sql.push_str(&where_clauses.join(" AND "));
        sql.push_str(" ORDER BY COALESCE(s.ended_at, s.created_at) DESC LIMIT ?");

        let limit_i = limit as i64;
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = match (search.as_ref(), preset_bind.as_ref()) {
            (Some(pattern), Some(preset_id)) => {
                stmt.query_map(params![pattern, pattern, preset_id, limit_i], map_history_item)?
            }
            (Some(pattern), None) => {
                stmt.query_map(params![pattern, pattern, limit_i], map_history_item)?
            }
            (None, Some(preset_id)) => {
                stmt.query_map(params![preset_id, limit_i], map_history_item)?
            }
            (None, None) => stmt.query_map(params![limit_i], map_history_item)?,
        };
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn update_session_title(
        &self,
        session_id: &str,
        title: &str,
    ) -> Result<SessionHistoryItem, DatabaseError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(DatabaseError::from(rusqlite::Error::InvalidParameterName(
                "title cannot be empty".into(),
            )));
        }
        let now = Utc::now().to_rfc3339();
        let updated = self.conn.execute(
            "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3 AND status != 'deleted'",
            params![title, now, session_id],
        )?;
        if updated == 0 {
            return Err(DatabaseError::from(rusqlite::Error::QueryReturnedNoRows));
        }
        self.get_history_item(session_id)
    }

    pub fn get_history_item(
        &self,
        session_id: &str,
    ) -> Result<SessionHistoryItem, DatabaseError> {
        self.conn
            .query_row(
                "SELECT s.id, s.title, s.status, s.started_at, s.ended_at, s.created_at,
             (SELECT COUNT(*) FROM transcript_segments t WHERE t.session_id = s.id) AS transcript_count,
             (SELECT COUNT(*) FROM guidance_suggestions g WHERE g.session_id = s.id) AS suggestion_count,
             (SELECT COUNT(*) FROM generated_documents d WHERE d.session_id = s.id) AS document_count,
             c.assistant_preset_id
             FROM sessions s
             LEFT JOIN session_contexts c ON c.session_id = s.id
             WHERE s.id = ?1 AND s.status != 'deleted'",
                [session_id],
                map_history_item,
            )
            .map_err(DatabaseError::from)
    }

    pub fn get_session(&self, session_id: &str) -> Result<Session, DatabaseError> {
        self.conn
            .query_row(
                "SELECT id, title, status, started_at, ended_at, source_language, target_language, stealth_mode_enabled, provider_id, storage_path, hosted_data_acknowledged, created_at, updated_at
                 FROM sessions WHERE id = ?1 AND status != 'deleted'",
                [session_id],
                super::repositories::map_session,
            )
            .map_err(DatabaseError::from)
    }

    pub fn list_transcripts(
        &self,
        session_id: &str,
    ) -> Result<Vec<TranscriptSegment>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, speaker_label, started_at_ms, ended_at_ms, language, text, confidence, is_uncertain, source, created_at
             FROM transcript_segments WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([session_id], super::repositories::map_transcript)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn list_suggestions(
        &self,
        session_id: &str,
    ) -> Result<Vec<GuidanceSuggestion>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, trigger_segment_ids_json, suggestion_type, text, rationale, confidence, provider_id, shown_at, copied_at, saved, created_at
             FROM guidance_suggestions WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([session_id], |row| {
            let triggers: String = row.get(2)?;
            let trigger_segment_ids: Vec<String> =
                serde_json::from_str(&triggers).unwrap_or_default();
            Ok(GuidanceSuggestion {
                id: row.get(0)?,
                session_id: row.get(1)?,
                trigger_segment_ids,
                suggestion_type: super::repositories::parse_suggestion_type(
                    row.get::<_, String>(3)?,
                ),
                text: row.get(4)?,
                rationale: row.get(5)?,
                confidence: row.get(6)?,
                provider_id: row.get(7)?,
                shown_at: row
                    .get::<_, Option<String>>(8)?
                    .map(super::repositories::parse_dt)
                    .transpose()?,
                copied_at: row
                    .get::<_, Option<String>>(9)?
                    .map(super::repositories::parse_dt)
                    .transpose()?,
                saved: row.get::<_, i32>(10)? != 0,
                created_at: super::repositories::parse_dt(row.get(11)?)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn list_translations(
        &self,
        session_id: &str,
    ) -> Result<Vec<TranslationSegment>, DatabaseError> {
        TranslationRepository::new(self.conn).list_for_session(session_id)
    }

    pub fn list_provider_calls(
        &self,
        session_id: &str,
    ) -> Result<Vec<ProviderCallRecord>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, provider_id, purpose, local_or_hosted, request_started_at, request_finished_at, status, latency_ms, error_code
             FROM provider_calls WHERE session_id = ?1 ORDER BY request_started_at ASC",
        )?;
        let rows = stmt.query_map([session_id], |row| {
            Ok(ProviderCallRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                provider_id: row.get(2)?,
                purpose: row.get(3)?,
                local_or_hosted: row.get(4)?,
                request_started_at: super::repositories::parse_dt(row.get(5)?)?,
                request_finished_at: row
                    .get::<_, Option<String>>(6)?
                    .map(super::repositories::parse_dt)
                    .transpose()?,
                status: row.get(7)?,
                latency_ms: row.get(8)?,
                error_code: row.get(9)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn list_audit(&self, session_id: &str) -> Result<Vec<AuditLogEntry>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, category, action, details_json, severity, created_at
             FROM audit_log_entries WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([session_id], super::repositories::map_audit)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn get_context(&self, session_id: &str) -> Result<SessionContext, DatabaseError> {
        self.conn
            .query_row(
                "SELECT id, session_id, role, objective, audience, company_or_product_notes, custom_prompts, assistant_preset_id, preferred_tone, forbidden_topics, pre_meeting_context, pre_meeting_context_source, pre_meeting_attachment_pages, created_at, updated_at
                 FROM session_contexts WHERE session_id = ?1",
                [session_id],
                |row| {
                    Ok(SessionContext {
                        id: row.get(0)?,
                        session_id: row.get(1)?,
                        role: row.get(2)?,
                        objective: row.get(3)?,
                        audience: row.get(4)?,
                        company_or_product_notes: row.get(5)?,
                        custom_prompts: row.get(6)?,
                        assistant_preset_id: row.get(7)?,
                        preferred_tone: row.get(8)?,
                        forbidden_topics: row.get(9)?,
                        pre_meeting_context: row.get(10)?,
                        pre_meeting_context_source: row.get(11)?,
                        pre_meeting_attachment_pages: row.get(12)?,
                        created_at: super::repositories::parse_dt(row.get(13)?)?,
                        updated_at: super::repositories::parse_dt(row.get(14)?)?,
                    })
                },
            )
            .map_err(DatabaseError::from)
    }

    pub fn document_with_storage_path_exists(&self, path: &str) -> Result<bool, DatabaseError> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM generated_documents WHERE storage_path = ?1",
            [path],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    /// Ensures a session row exists for imported documents. Returns true when a new session was created.
    pub fn ensure_import_session(
        &self,
        session_id: &str,
        fallback_title: &str,
    ) -> Result<bool, DatabaseError> {
        let exists: bool = self
            .conn
            .query_row(
                "SELECT 1 FROM sessions WHERE id = ?1 AND status != 'deleted'",
                [session_id],
                |_| Ok(()),
            )
            .is_ok();
        if exists {
            return Ok(false);
        }

        let now = Utc::now();
        let title = if fallback_title.trim().is_empty() {
            format!("Sessão importada ({})", &session_id[..session_id.len().min(8)])
        } else {
            fallback_title.to_string()
        };
        self.conn.execute(
            "INSERT INTO sessions (id, title, status, started_at, ended_at, source_language, target_language, stealth_mode_enabled, provider_id, storage_path, hosted_data_acknowledged, created_at, updated_at)
             VALUES (?1,?2,'ended',?3,?3,'pt-BR',NULL,0,NULL,NULL,0,?3,?3)",
            params![session_id, title, now.to_rfc3339()],
        )?;
        self.conn.execute(
            "INSERT INTO session_contexts (id, session_id, role, objective, audience, company_or_product_notes, custom_prompts, assistant_preset_id, preferred_tone, forbidden_topics, pre_meeting_context, pre_meeting_context_source, pre_meeting_attachment_pages, created_at, updated_at)
             VALUES (?1,?2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,?3,?3)",
            params![uuid::Uuid::new_v4().to_string(), session_id, now.to_rfc3339()],
        )?;
        Ok(true)
    }

    pub fn insert_document(&self, doc: &GeneratedDocument) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO generated_documents (id, session_id, doc_type, title, content, format, storage_path, provider_id, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![
                doc.id,
                doc.session_id,
                doc_type_str(doc.doc_type),
                doc.title,
                doc.content,
                doc.format,
                doc.storage_path,
                doc.provider_id,
                doc.created_at.to_rfc3339(),
                doc.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_documents(
        &self,
        session_id: &str,
    ) -> Result<Vec<GeneratedDocument>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, doc_type, title, content, format, storage_path, provider_id, created_at, updated_at
             FROM generated_documents WHERE session_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([session_id], map_document)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn get_document(&self, id: &str) -> Result<GeneratedDocument, DatabaseError> {
        self.conn
            .query_row(
                "SELECT id, session_id, doc_type, title, content, format, storage_path, provider_id, created_at, updated_at
                 FROM generated_documents WHERE id = ?1",
                [id],
                map_document,
            )
            .map_err(DatabaseError::from)
    }

    pub fn update_document_storage_path(
        &self,
        id: &str,
        storage_path: &str,
    ) -> Result<(), DatabaseError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE generated_documents SET storage_path = ?1, updated_at = ?2 WHERE id = ?3",
            params![storage_path, now, id],
        )?;
        Ok(())
    }

    pub fn delete_document(&self, id: &str) -> Result<Option<String>, DatabaseError> {
        let path = self.get_document(id).ok().and_then(|d| d.storage_path);
        self.conn
            .execute("DELETE FROM generated_documents WHERE id = ?1", [id])?;
        Ok(path)
    }

    pub fn delete_session_row(&self, session_id: &str) -> Result<(), DatabaseError> {
        self.conn
            .execute("DELETE FROM sessions WHERE id = ?1", [session_id])?;
        Ok(())
    }

    pub fn mark_session_deleted(&self, session_id: &str) -> Result<(), DatabaseError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE sessions SET status = 'deleted', updated_at = ?1 WHERE id = ?2",
            params![now, session_id],
        )?;
        Ok(())
    }

    pub fn insert_deletion_request(
        &self,
        id: &str,
        target_type: &str,
        target_id: &str,
        status: &str,
        failure_reason: Option<&str>,
    ) -> Result<(), DatabaseError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO deletion_requests (id, target_type, target_id, requested_at, completed_at, status, failure_reason)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                id,
                target_type,
                target_id,
                now,
                now,
                status,
                failure_reason,
            ],
        )?;
        Ok(())
    }
}

fn map_history_item(row: &rusqlite::Row<'_>) -> Result<SessionHistoryItem, rusqlite::Error> {
    Ok(SessionHistoryItem {
        id: row.get(0)?,
        title: row.get(1)?,
        status: parse_session_status(row.get::<_, String>(2)?),
        started_at: row
            .get::<_, Option<String>>(3)?
            .map(super::repositories::parse_dt)
            .transpose()?,
        ended_at: row
            .get::<_, Option<String>>(4)?
            .map(super::repositories::parse_dt)
            .transpose()?,
        created_at: super::repositories::parse_dt(row.get(5)?)?,
        transcript_count: row.get(6)?,
        suggestion_count: row.get(7)?,
        document_count: row.get(8)?,
        assistant_preset_id: row.get::<_, Option<String>>(9)?,
    })
}

fn map_document(row: &rusqlite::Row<'_>) -> Result<GeneratedDocument, rusqlite::Error> {
    Ok(GeneratedDocument {
        id: row.get(0)?,
        session_id: row.get(1)?,
        doc_type: parse_document_type(row.get::<_, String>(2)?),
        title: row.get(3)?,
        content: row.get(4)?,
        format: row.get(5)?,
        storage_path: row.get(6)?,
        provider_id: row.get(7)?,
        created_at: super::repositories::parse_dt(row.get(8)?)?,
        updated_at: super::repositories::parse_dt(row.get(9)?)?,
    })
}

fn doc_type_str(t: crate::models::DocumentType) -> &'static str {
    match t {
        crate::models::DocumentType::Summary => "summary",
        crate::models::DocumentType::FollowUpEmail => "follow_up_email",
        crate::models::DocumentType::TranscriptExport => "transcript_export",
        crate::models::DocumentType::ObjectionAnalysis => "objection_analysis",
        crate::models::DocumentType::Notes => "notes",
        crate::models::DocumentType::Custom => "custom",
    }
}

pub fn parse_document_type(s: String) -> crate::models::DocumentType {
    match s.as_str() {
        "follow_up_email" => crate::models::DocumentType::FollowUpEmail,
        "transcript_export" => crate::models::DocumentType::TranscriptExport,
        "objection_analysis" => crate::models::DocumentType::ObjectionAnalysis,
        "notes" => crate::models::DocumentType::Notes,
        "custom" => crate::models::DocumentType::Custom,
        _ => crate::models::DocumentType::Summary,
    }
}

fn parse_session_status(s: String) -> SessionStatus {
    match s.as_str() {
        "listening" => SessionStatus::Listening,
        "paused" => SessionStatus::Paused,
        "reconnecting" => SessionStatus::Reconnecting,
        "ended" => SessionStatus::Ended,
        "failed" => SessionStatus::Failed,
        "deleted" => SessionStatus::Deleted,
        _ => SessionStatus::Draft,
    }
}
