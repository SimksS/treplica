use crate::models::TranslationSegment;
use crate::DatabaseError;
use chrono::Utc;
use rusqlite::{params, Connection};

pub struct TranslationRepository<'a> {
    conn: &'a Connection,
}

impl<'a> TranslationRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn set_session_target_language(
        &self,
        session_id: &str,
        target_language: Option<&str>,
    ) -> Result<(), DatabaseError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE sessions SET target_language = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_language, now, session_id],
        )?;
        Ok(())
    }

    pub fn get_session_target_language(
        &self,
        session_id: &str,
    ) -> Result<Option<String>, DatabaseError> {
        self.conn
            .query_row(
                "SELECT target_language FROM sessions WHERE id = ?1",
                [session_id],
                |row| row.get(0),
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    DatabaseError::Sqlite(rusqlite::Error::QueryReturnedNoRows)
                }
                other => DatabaseError::Sqlite(other),
            })
    }

    pub fn insert(&self, segment: &TranslationSegment) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO translation_segments (id, session_id, transcript_segment_id, source_language, target_language, text, confidence, is_uncertain, provider_id, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![
                segment.id,
                segment.session_id,
                segment.transcript_segment_id,
                segment.source_language,
                segment.target_language,
                segment.text,
                segment.confidence,
                segment.is_uncertain as i32,
                segment.provider_id,
                segment.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn count_for_session(&self, session_id: &str) -> Result<usize, DatabaseError> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM translation_segments WHERE session_id = ?1",
            [session_id],
            |r| r.get(0),
        )?;
        Ok(count as usize)
    }

    pub fn list_for_session(
        &self,
        session_id: &str,
    ) -> Result<Vec<TranslationSegment>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, transcript_segment_id, source_language, target_language, text, confidence, is_uncertain, provider_id, created_at
             FROM translation_segments WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([session_id], |row| {
            Ok(TranslationSegment {
                id: row.get(0)?,
                session_id: row.get(1)?,
                transcript_segment_id: row.get(2)?,
                source_language: row.get(3)?,
                target_language: row.get(4)?,
                text: row.get(5)?,
                confidence: row.get(6)?,
                is_uncertain: row.get::<_, i32>(7)? != 0,
                provider_id: row.get(8)?,
                created_at: parse_dt(row.get(9)?)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    /// Most recent `limit` translations in chronological order (for live UI window).
    pub fn list_for_session_recent(
        &self,
        session_id: &str,
        limit: usize,
    ) -> Result<Vec<TranslationSegment>, DatabaseError> {
        if limit == 0 {
            return Ok(Vec::new());
        }
        let limit = limit as i64;
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, transcript_segment_id, source_language, target_language, text, confidence, is_uncertain, provider_id, created_at
             FROM translation_segments WHERE session_id = ?1
             ORDER BY created_at DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![session_id, limit], |row| {
            Ok(TranslationSegment {
                id: row.get(0)?,
                session_id: row.get(1)?,
                transcript_segment_id: row.get(2)?,
                source_language: row.get(3)?,
                target_language: row.get(4)?,
                text: row.get(5)?,
                confidence: row.get(6)?,
                is_uncertain: row.get::<_, i32>(7)? != 0,
                provider_id: row.get(8)?,
                created_at: parse_dt(row.get(9)?)?,
            })
        })?;
        let mut items: Vec<TranslationSegment> = rows.collect::<Result<Vec<_>, _>>()?;
        items.reverse();
        Ok(items)
    }

    pub fn find_by_transcript(
        &self,
        transcript_segment_id: &str,
    ) -> Result<Option<TranslationSegment>, DatabaseError> {
        let result = self.conn.query_row(
            "SELECT id, session_id, transcript_segment_id, source_language, target_language, text, confidence, is_uncertain, provider_id, created_at
             FROM translation_segments WHERE transcript_segment_id = ?1",
            [transcript_segment_id],
            |row| {
                Ok(TranslationSegment {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    transcript_segment_id: row.get(2)?,
                    source_language: row.get(3)?,
                    target_language: row.get(4)?,
                    text: row.get(5)?,
                    confidence: row.get(6)?,
                    is_uncertain: row.get::<_, i32>(7)? != 0,
                    provider_id: row.get(8)?,
                    created_at: parse_dt(row.get(9)?)?,
                })
            },
        );
        match result {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DatabaseError::from(e)),
        }
    }
}

fn parse_dt(s: String) -> Result<chrono::DateTime<Utc>, rusqlite::Error> {
    chrono::DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))
}
