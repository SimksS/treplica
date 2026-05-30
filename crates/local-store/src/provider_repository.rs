use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::{AiProviderConfiguration, UserProfile};
use crate::DatabaseError;

pub struct ProviderRepository<'a> {
    conn: &'a Connection,
}

impl<'a> ProviderRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn ensure_default_profile(&self) -> Result<UserProfile, DatabaseError> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM user_profiles", [], |row| row.get(0))?;
        if count > 0 {
            return self.get_default_profile();
        }
        let now = Utc::now();
        let profile = UserProfile {
            id: Uuid::new_v4().to_string(),
            display_name: Some("Usuário".into()),
            default_language: "pt-BR".into(),
            default_provider_id: None,
            privacy_mode: crate::models::PrivacyMode::LocalOnly,
            created_at: now,
            updated_at: now,
        };
        self.conn.execute(
            "INSERT INTO user_profiles (id, display_name, default_language, default_provider_id, privacy_mode, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                profile.id,
                profile.display_name,
                profile.default_language,
                profile.default_provider_id,
                privacy_mode_str(profile.privacy_mode),
                profile.created_at.to_rfc3339(),
                profile.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(profile)
    }

    pub fn get_default_profile(&self) -> Result<UserProfile, DatabaseError> {
        self.conn
            .query_row(
                "SELECT id, display_name, default_language, default_provider_id, privacy_mode, created_at, updated_at
                 FROM user_profiles ORDER BY created_at ASC LIMIT 1",
                [],
                map_profile,
            )
            .map_err(DatabaseError::from)
    }

    pub fn update_privacy_mode(
        &self,
        privacy_mode: crate::models::PrivacyMode,
    ) -> Result<UserProfile, DatabaseError> {
        let profile = self.get_default_profile()?;
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE user_profiles SET privacy_mode = ?1, updated_at = ?2 WHERE id = ?3",
            params![privacy_mode_str(privacy_mode), now, profile.id],
        )?;
        self.get_default_profile()
    }

    pub fn list_providers(&self) -> Result<Vec<AiProviderConfiguration>, DatabaseError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, provider_kind, display_name, base_url, model, capabilities_json, credential_ref, enabled, local_only, created_at, updated_at
             FROM ai_provider_configurations ORDER BY display_name ASC",
        )?;
        let rows = stmt.query_map([], map_provider)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(DatabaseError::from)
    }

    pub fn get_provider(&self, id: &str) -> Result<AiProviderConfiguration, DatabaseError> {
        self.conn
            .query_row(
                "SELECT id, provider_kind, display_name, base_url, model, capabilities_json, credential_ref, enabled, local_only, created_at, updated_at
                 FROM ai_provider_configurations WHERE id = ?1",
                [id],
                map_provider,
            )
            .map_err(DatabaseError::from)
    }

    pub fn insert_provider(&self, config: &AiProviderConfiguration) -> Result<(), DatabaseError> {
        self.conn.execute(
            "INSERT INTO ai_provider_configurations (id, provider_kind, display_name, base_url, model, capabilities_json, credential_ref, enabled, local_only, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            params![
                config.id,
                config.provider_kind,
                config.display_name,
                config.base_url,
                config.model,
                config.capabilities_json,
                config.credential_ref,
                config.enabled as i32,
                config.local_only as i32,
                config.created_at.to_rfc3339(),
                config.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn update_provider(&self, config: &AiProviderConfiguration) -> Result<(), DatabaseError> {
        self.conn.execute(
            "UPDATE ai_provider_configurations SET provider_kind = ?1, display_name = ?2, base_url = ?3, model = ?4, capabilities_json = ?5, credential_ref = ?6, enabled = ?7, local_only = ?8, updated_at = ?9 WHERE id = ?10",
            params![
                config.provider_kind,
                config.display_name,
                config.base_url,
                config.model,
                config.capabilities_json,
                config.credential_ref,
                config.enabled as i32,
                config.local_only as i32,
                config.updated_at.to_rfc3339(),
                config.id,
            ],
        )?;
        Ok(())
    }

    pub fn set_provider_enabled(&self, id: &str, enabled: bool) -> Result<(), DatabaseError> {
        self.conn.execute(
            "UPDATE ai_provider_configurations SET enabled = ?1, updated_at = ?2 WHERE id = ?3",
            params![enabled as i32, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    pub fn delete_provider(&self, id: &str) -> Result<(), DatabaseError> {
        self.conn
            .execute("DELETE FROM ai_provider_configurations WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn ensure_default_ollama(&self) -> Result<AiProviderConfiguration, DatabaseError> {
        let existing: Result<AiProviderConfiguration, _> = self.conn.query_row(
            "SELECT id, provider_kind, display_name, base_url, model, capabilities_json, credential_ref, enabled, local_only, created_at, updated_at
             FROM ai_provider_configurations WHERE provider_kind = 'ollama' LIMIT 1",
            [],
            map_provider,
        );
        if let Ok(p) = existing {
            return Ok(p);
        }
        let now = Utc::now();
        let config = AiProviderConfiguration {
            id: Uuid::new_v4().to_string(),
            provider_kind: "ollama".into(),
            display_name: "Ollama (local)".into(),
            base_url: Some("http://127.0.0.1:11434".into()),
            model: Some("llama3.2".into()),
            capabilities_json: r#"["chat","streaming","translation","summarization","transcription","vision","search"]"#.into(),
            credential_ref: None,
            enabled: true,
            local_only: true,
            created_at: now,
            updated_at: now,
        };
        self.insert_provider(&config)?;
        Ok(config)
    }

    /// Upgrades hosted providers missing vision/search capabilities (older DB rows).
    pub fn ensure_full_capabilities(&self) -> Result<(), DatabaseError> {
        const FULL: &str = r#"["chat","streaming","translation","summarization","structured_output","transcription","vision","search"]"#;
        self.conn.execute(
            "UPDATE ai_provider_configurations
             SET capabilities_json = ?1, updated_at = ?2
             WHERE provider_kind != 'ollama'
               AND (
                 capabilities_json = '[\"chat\"]'
                 OR capabilities_json = '[]'
                 OR capabilities_json NOT LIKE '%vision%'
               )",
            params![FULL, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }
}

fn map_profile(row: &rusqlite::Row<'_>) -> Result<UserProfile, rusqlite::Error> {
    Ok(UserProfile {
        id: row.get(0)?,
        display_name: row.get(1)?,
        default_language: row.get(2)?,
        default_provider_id: row.get(3)?,
        privacy_mode: parse_privacy_mode(row.get::<_, String>(4)?),
        created_at: super::repositories::parse_dt(row.get(5)?)?,
        updated_at: super::repositories::parse_dt(row.get(6)?)?,
    })
}

fn map_provider(row: &rusqlite::Row<'_>) -> Result<AiProviderConfiguration, rusqlite::Error> {
    Ok(AiProviderConfiguration {
        id: row.get(0)?,
        provider_kind: row.get(1)?,
        display_name: row.get(2)?,
        base_url: row.get(3)?,
        model: row.get(4)?,
        capabilities_json: row.get(5)?,
        credential_ref: row.get(6)?,
        enabled: row.get::<_, i32>(7)? != 0,
        local_only: row.get::<_, i32>(8)? != 0,
        created_at: super::repositories::parse_dt(row.get(9)?)?,
        updated_at: super::repositories::parse_dt(row.get(10)?)?,
    })
}

fn privacy_mode_str(mode: crate::models::PrivacyMode) -> &'static str {
    match mode {
        crate::models::PrivacyMode::LocalOnly => "local_only",
        crate::models::PrivacyMode::HostedPerSession => "hosted_per_session",
        crate::models::PrivacyMode::HostedDefault => "hosted_default",
    }
}

pub fn parse_privacy_mode(s: String) -> crate::models::PrivacyMode {
    match s.as_str() {
        "hosted_per_session" => crate::models::PrivacyMode::HostedPerSession,
        "hosted_default" => crate::models::PrivacyMode::HostedDefault,
        _ => crate::models::PrivacyMode::LocalOnly,
    }
}
