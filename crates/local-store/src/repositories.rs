use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::{
    AuditLogEntry, GuidanceSuggestion, Session, SessionContext, SessionStatus, SuggestionType,
    TranscriptSegment, UserProfile,
};
use crate::DatabaseError;

pub struct StoreRepositories<'a> {
    conn: &'a Connection,
}

impl<'a> StoreRepositories<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn conn(&self) -> &Connection {
        self.conn
    }

    pub fn ensure_default_profile(&self) -> Result<UserProfile, DatabaseError> {
        let existing: Option<String> = self
            .conn
            .query_row("SELECT id FROM user_profiles LIMIT 1", [], |row| row.get(0))
            .ok();
        if let Some(id) = existing {
            return self.get_profile(&id);
        }
        let now = Utc::now();
        let profile = UserProfile {
            id: Uuid::new_v4().to_string(),
            display_name: None,
            default_language: "pt-BR".into(),
            default_provider_id: None,
            privacy_mode: crate::models::PrivacyMode::LocalOnly,
            created_at: now,
            updated_at: now,
        };
        self.conn.execute(
            "INSERT INTO user_profiles (id, display_name, default_language, default_provider_id, privacy_mode, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                profile.id,
                profile.display_name,
                profile.default_language,
                profile.default_provider_id,
                "local_only",
                profile.created_at.to_rfc3339(),
                profile.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(profile)
    }

    pub fn get_profile(&self, id: &str) -> Result<UserProfile, DatabaseError> {
        self.conn.query_row(
            "SELECT id, display_name, default_language, default_provider_id, privacy_mode, created_at, updated_at
             FROM user_profiles WHERE id = ?1",
            [id],
            |row| {
                Ok(UserProfile {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    default_language: row.get(2)?,
                    default_provider_id: row.get(3)?,
                    privacy_mode: crate::models::PrivacyMode::LocalOnly,
                    created_at: parse_dt(row.get(5)?)?,
                    updated_at: parse_dt(row.get(6)?)?,
                })
            },
        )
        .map_err(DatabaseError::from)
    }

    pub fn create_session(&self, title: &str) -> Result<Session, DatabaseError> {
        let now = Utc::now();
        let session = Session {
            id: Uuid::new_v4().to_string(),
            title: title.to_string(),
            status: SessionStatus::Draft,
            started_at: None,
            ended_at: None,
            source_language: "pt-BR".into(),
            target_language: None,
            stealth_mode_enabled: false,
            provider_id: None,
            storage_path: None,
            hosted_data_acknowledged: false,
            created_at: now,
            updated_at: now,
        };
        self.conn.execute(
            "INSERT INTO sessions (id, title, status, started_at, ended_at, source_language, target_language, stealth_mode_enabled, provider_id, storage_path, hosted_data_acknowledged, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
            params![
                session.id,
                session.title,
                status_str(session.status),
                session.started_at.map(|t| t.to_rfc3339()),
                session.ended_at.map(|t| t.to_rfc3339()),
                session.source_language,
                session.target_language,
                session.stealth_mode_enabled as i32,
                session.provider_id,
                session.storage_path,
                session.hosted_data_acknowledged as i32,
                session.created_at.to_rfc3339(),
                session.updated_at.to_rfc3339(),
            ],
        )?;
        let ctx = SessionContext {
            id: Uuid::new_v4().to_string(),
            session_id: session.id.clone(),
            role: None,
            objective: None,
            audience: None,
            company_or_product_notes: None,
            custom_prompts: None,
            assistant_preset_id: None,
            preferred_tone: None,
            forbidden_topics: None,
            pre_meeting_context: None,
            pre_meeting_context_source: None,
            pre_meeting_attachment_pages: None,
            created_at: now,
            updated_at: now,
        };
        self.insert_context(&ctx)?;
        Ok(session)
    }

    fn insert_context(&self, ctx: &SessionContext) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO session_contexts (id, session_id, role, objective, audience, company_or_product_notes, custom_prompts, assistant_preset_id, preferred_tone, forbidden_topics, pre_meeting_context, pre_meeting_context_source, pre_meeting_attachment_pages, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",
            params![
                ctx.id,
                ctx.session_id,
                ctx.role,
                ctx.objective,
                ctx.audience,
                ctx.company_or_product_notes,
                ctx.custom_prompts,
                ctx.assistant_preset_id,
                ctx.preferred_tone,
                ctx.forbidden_topics,
                ctx.pre_meeting_context,
                ctx.pre_meeting_context_source,
                ctx.pre_meeting_attachment_pages,
                ctx.created_at.to_rfc3339(),
                ctx.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_session(&self, id: &str) -> Result<Session, DatabaseError> {
        self.conn.query_row(
            "SELECT id, title, status, started_at, ended_at, source_language, target_language, stealth_mode_enabled, provider_id, storage_path, hosted_data_acknowledged, created_at, updated_at
             FROM sessions WHERE id = ?1",
            [id],
            map_session,
        )
        .map_err(DatabaseError::from)
    }

    pub fn set_session_hosted_data_acknowledged(
        &self,
        session_id: &str,
        acknowledged: bool,
    ) -> Result<Session, DatabaseError> {
        let now = Utc::now();
        self.conn.execute(
            "UPDATE sessions SET hosted_data_acknowledged = ?1, updated_at = ?2 WHERE id = ?3",
            params![acknowledged as i32, now.to_rfc3339(), session_id],
        )?;
        self.get_session(session_id)
    }

    /// Marks any sessions stuck in transient statuses (listening/paused/reconnecting/draft)
    /// as ended. Called on app startup to clean up sessions orphaned by a previous crash or
    /// force-close that bypassed the normal end_session flow.
    pub fn close_orphaned_sessions(&self) -> Result<usize, DatabaseError> {
        let now = Utc::now().to_rfc3339();
        let count = self.conn.execute(
            "UPDATE sessions SET status = 'ended', ended_at = COALESCE(ended_at, ?1), updated_at = ?1
             WHERE status IN ('listening', 'paused', 'reconnecting', 'draft')",
            params![now],
        )?;
        Ok(count)
    }

    pub fn update_session_status(
        &self,
        id: &str,
        status: SessionStatus,
        started_at: Option<DateTime<Utc>>,
        ended_at: Option<DateTime<Utc>>,
    ) -> Result<Session, DatabaseError> {
        let now = Utc::now();
        self.conn.execute(
            "UPDATE sessions SET status = ?1, started_at = COALESCE(?2, started_at), ended_at = COALESCE(?3, ended_at), updated_at = ?4 WHERE id = ?5",
            params![
                status_str(status),
                started_at.map(|t| t.to_rfc3339()),
                ended_at.map(|t| t.to_rfc3339()),
                now.to_rfc3339(),
                id,
            ],
        )?;
        self.get_session(id)
    }

    pub fn get_session_context(&self, session_id: &str) -> Result<SessionContext, DatabaseError> {
        self.conn.query_row(
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
                    created_at: parse_dt(row.get(13)?)?,
                    updated_at: parse_dt(row.get(14)?)?,
                })
            },
        )
        .map_err(DatabaseError::from)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update_session_context(
        &self,
        session_id: &str,
        role: Option<&str>,
        objective: Option<&str>,
        audience: Option<&str>,
        company_or_product_notes: Option<&str>,
        system_prompt: Option<&str>,
        assistant_preset_id: Option<&str>,
        preferred_tone: Option<&str>,
        forbidden_topics: Option<&str>,
        pre_meeting_context: Option<&str>,
        pre_meeting_context_source: Option<&str>,
        pre_meeting_attachment_pages: Option<&str>,
    ) -> Result<SessionContext, DatabaseError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE session_contexts SET role = ?1, objective = ?2, audience = ?3, company_or_product_notes = ?4, custom_prompts = ?5, assistant_preset_id = ?6, preferred_tone = ?7, forbidden_topics = ?8, pre_meeting_context = ?9, pre_meeting_context_source = ?10, pre_meeting_attachment_pages = ?11, updated_at = ?12 WHERE session_id = ?13",
            params![
                empty_to_none(role),
                empty_to_none(objective),
                empty_to_none(audience),
                empty_to_none(company_or_product_notes),
                empty_to_none(system_prompt),
                empty_to_none(assistant_preset_id),
                empty_to_none(preferred_tone),
                empty_to_none(forbidden_topics),
                empty_to_none(pre_meeting_context),
                empty_to_none(pre_meeting_context_source),
                empty_to_none(pre_meeting_attachment_pages),
                now,
                session_id,
            ],
        )?;
        self.get_session_context(session_id)
    }

    pub fn insert_transcript(&self, segment: &TranscriptSegment) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO transcript_segments (id, session_id, speaker_label, started_at_ms, ended_at_ms, language, text, confidence, is_uncertain, source, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            params![
                segment.id,
                segment.session_id,
                segment.speaker_label,
                segment.started_at_ms,
                segment.ended_at_ms,
                segment.language,
                segment.text,
                segment.confidence,
                segment.is_uncertain as i32,
                segment.source,
                segment.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn count_transcripts(&self, session_id: &str) -> Result<usize, DatabaseError> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM transcript_segments WHERE session_id = ?1",
            [session_id],
            |r| r.get(0),
        )?;
        Ok(count as usize)
    }

    pub fn list_transcripts(
        &self,
        session_id: &str,
    ) -> Result<Vec<TranscriptSegment>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, speaker_label, started_at_ms, ended_at_ms, language, text, confidence, is_uncertain, source, created_at
             FROM transcript_segments WHERE session_id = ?1 ORDER BY started_at_ms ASC",
        )?;
        let rows = stmt.query_map([session_id], map_transcript)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    /// Most recent `limit` segments in chronological order (for live UI window).
    pub fn list_transcripts_recent(
        &self,
        session_id: &str,
        limit: usize,
    ) -> Result<Vec<TranscriptSegment>, DatabaseError> {
        if limit == 0 {
            return Ok(Vec::new());
        }
        let limit = limit as i64;
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, speaker_label, started_at_ms, ended_at_ms, language, text, confidence, is_uncertain, source, created_at
             FROM transcript_segments WHERE session_id = ?1
             ORDER BY started_at_ms DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![session_id, limit], map_transcript)?;
        let mut items: Vec<TranscriptSegment> = rows.collect::<Result<Vec<_>, _>>()?;
        items.reverse();
        Ok(items)
    }

    pub fn count_suggestions(&self, session_id: &str) -> Result<usize, DatabaseError> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM guidance_suggestions WHERE session_id = ?1",
            [session_id],
            |r| r.get(0),
        )?;
        Ok(count as usize)
    }

    pub fn insert_suggestion(&self, s: &GuidanceSuggestion) -> Result<(), DatabaseError> {
        let triggers =
            serde_json::to_string(&s.trigger_segment_ids).unwrap_or_else(|_| "[]".into());
        self.conn.execute(
            "INSERT INTO guidance_suggestions (id, session_id, trigger_segment_ids_json, suggestion_type, text, rationale, confidence, provider_id, shown_at, copied_at, saved, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![
                s.id,
                s.session_id,
                triggers,
                suggestion_type_str(s.suggestion_type),
                s.text,
                s.rationale,
                s.confidence,
                s.provider_id,
                s.shown_at.map(|t| t.to_rfc3339()),
                s.copied_at.map(|t| t.to_rfc3339()),
                s.saved as i32,
                s.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
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
                suggestion_type: parse_suggestion_type(row.get::<_, String>(3)?),
                text: row.get(4)?,
                rationale: row.get(5)?,
                confidence: row.get(6)?,
                provider_id: row.get(7)?,
                shown_at: row.get::<_, Option<String>>(8)?.map(parse_dt).transpose()?,
                copied_at: row.get::<_, Option<String>>(9)?.map(parse_dt).transpose()?,
                saved: row.get::<_, i32>(10)? != 0,
                created_at: parse_dt(row.get(11)?)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    /// Most recent `limit` suggestions in chronological order (for live UI window).
    pub fn list_suggestions_recent(
        &self,
        session_id: &str,
        limit: usize,
    ) -> Result<Vec<GuidanceSuggestion>, DatabaseError> {
        if limit == 0 {
            return Ok(Vec::new());
        }
        let limit = limit as i64;
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, trigger_segment_ids_json, suggestion_type, text, rationale, confidence, provider_id, shown_at, copied_at, saved, created_at
             FROM guidance_suggestions WHERE session_id = ?1
             ORDER BY created_at DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![session_id, limit], |row| {
            let triggers: String = row.get(2)?;
            let trigger_segment_ids: Vec<String> =
                serde_json::from_str(&triggers).unwrap_or_default();
            Ok(GuidanceSuggestion {
                id: row.get(0)?,
                session_id: row.get(1)?,
                trigger_segment_ids,
                suggestion_type: parse_suggestion_type(row.get::<_, String>(3)?),
                text: row.get(4)?,
                rationale: row.get(5)?,
                confidence: row.get(6)?,
                provider_id: row.get(7)?,
                shown_at: row.get::<_, Option<String>>(8)?.map(parse_dt).transpose()?,
                copied_at: row.get::<_, Option<String>>(9)?.map(parse_dt).transpose()?,
                saved: row.get::<_, i32>(10)? != 0,
                created_at: parse_dt(row.get(11)?)?,
            })
        })?;
        let mut items: Vec<GuidanceSuggestion> = rows.collect::<Result<Vec<_>, _>>()?;
        items.reverse();
        Ok(items)
    }

    pub fn mark_suggestion_copied(&self, id: &str) -> Result<(), DatabaseError> {
        self.conn.execute(
            "UPDATE guidance_suggestions SET copied_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    pub fn mark_suggestion_saved(&self, id: &str) -> Result<(), DatabaseError> {
        self.conn.execute(
            "UPDATE guidance_suggestions SET saved = 1 WHERE id = ?1",
            [id],
        )?;
        Ok(())
    }

    pub fn insert_audit(&self, entry: &AuditLogEntry) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO audit_log_entries (id, session_id, category, action, details_json, severity, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                entry.id,
                entry.session_id,
                entry.category,
                entry.action,
                entry.details_json,
                entry.severity,
                entry.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_audit_for_session(
        &self,
        session_id: &str,
    ) -> Result<Vec<AuditLogEntry>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, category, action, details_json, severity, created_at
             FROM audit_log_entries WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([session_id], map_audit)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn insert_provider_call(
        &self,
        record: &crate::models::ProviderCallRecord,
    ) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO provider_calls (id, session_id, provider_id, purpose, local_or_hosted, request_started_at, request_finished_at, status, latency_ms, input_bytes, output_bytes, error_code, redaction_summary)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,NULL,NULL,?10,NULL)",
            params![
                record.id,
                record.session_id,
                record.provider_id,
                record.purpose,
                record.local_or_hosted,
                record.request_started_at.to_rfc3339(),
                record.request_finished_at.map(|t| t.to_rfc3339()),
                record.status,
                record.latency_ms,
                record.error_code,
            ],
        )?;
        Ok(())
    }
}

pub(crate) fn parse_dt(s: String) -> Result<DateTime<Utc>, rusqlite::Error> {
    DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))
}

fn status_str(s: SessionStatus) -> &'static str {
    match s {
        SessionStatus::Draft => "draft",
        SessionStatus::Listening => "listening",
        SessionStatus::Paused => "paused",
        SessionStatus::Reconnecting => "reconnecting",
        SessionStatus::Ended => "ended",
        SessionStatus::Failed => "failed",
        SessionStatus::Deleted => "deleted",
    }
}

fn suggestion_type_str(t: SuggestionType) -> &'static str {
    match t {
        SuggestionType::Answer => "answer",
        SuggestionType::ObjectionResponse => "objection_response",
        SuggestionType::FollowUpQuestion => "follow_up_question",
        SuggestionType::TalkingPoint => "talking_point",
        SuggestionType::NextStep => "next_step",
        SuggestionType::Fallback => "fallback",
    }
}

pub(crate) fn parse_suggestion_type(s: String) -> SuggestionType {
    match s.as_str() {
        "objection_response" => SuggestionType::ObjectionResponse,
        "follow_up_question" => SuggestionType::FollowUpQuestion,
        "talking_point" => SuggestionType::TalkingPoint,
        "next_step" => SuggestionType::NextStep,
        "fallback" => SuggestionType::Fallback,
        _ => SuggestionType::Answer,
    }
}

pub(crate) fn map_session(row: &rusqlite::Row<'_>) -> Result<Session, rusqlite::Error> {
    let status: String = row.get(2)?;
    Ok(Session {
        id: row.get(0)?,
        title: row.get(1)?,
        status: parse_session_status(&status),
        started_at: row.get::<_, Option<String>>(3)?.map(parse_dt).transpose()?,
        ended_at: row.get::<_, Option<String>>(4)?.map(parse_dt).transpose()?,
        source_language: row.get(5)?,
        target_language: row.get(6)?,
        stealth_mode_enabled: row.get::<_, i32>(7)? != 0,
        provider_id: row.get(8)?,
        storage_path: row.get(9)?,
        hosted_data_acknowledged: row.get::<_, i32>(10)? != 0,
        created_at: parse_dt(row.get(11)?)?,
        updated_at: parse_dt(row.get(12)?)?,
    })
}

fn parse_session_status(s: &str) -> SessionStatus {
    match s {
        "listening" => SessionStatus::Listening,
        "paused" => SessionStatus::Paused,
        "reconnecting" => SessionStatus::Reconnecting,
        "ended" => SessionStatus::Ended,
        "failed" => SessionStatus::Failed,
        "deleted" => SessionStatus::Deleted,
        _ => SessionStatus::Draft,
    }
}

pub(crate) fn map_transcript(
    row: &rusqlite::Row<'_>,
) -> Result<TranscriptSegment, rusqlite::Error> {
    Ok(TranscriptSegment {
        id: row.get(0)?,
        session_id: row.get(1)?,
        speaker_label: row.get(2)?,
        started_at_ms: row.get(3)?,
        ended_at_ms: row.get(4)?,
        language: row.get(5)?,
        text: row.get(6)?,
        confidence: row.get(7)?,
        is_uncertain: row.get::<_, i32>(8)? != 0,
        source: row.get(9)?,
        created_at: parse_dt(row.get(10)?)?,
    })
}

pub(crate) fn map_audit(row: &rusqlite::Row<'_>) -> Result<AuditLogEntry, rusqlite::Error> {
    Ok(AuditLogEntry {
        id: row.get(0)?,
        session_id: row.get(1)?,
        category: row.get(2)?,
        action: row.get(3)?,
        details_json: row.get(4)?,
        severity: row.get(5)?,
        created_at: parse_dt(row.get(6)?)?,
    })
}

fn empty_to_none(value: Option<&str>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}
