use std::fs;
use std::path::Path;

use rusqlite::Connection;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("migration missing")]
    MigrationMissing,
}

pub type DatabaseResult<T> = Result<T, DatabaseError>;

const MIGRATION_0001: &str =
    include_str!("../../../apps/desktop/src-tauri/migrations/0001_initial.sql");
const MIGRATION_0002: &str =
    include_str!("../../../apps/desktop/src-tauri/migrations/0002_system_prompt_and_routing.sql");
const MIGRATION_0003: &str =
    include_str!("../../../apps/desktop/src-tauri/migrations/0003_pre_meeting_context.sql");
const MIGRATION_0004: &str =
    include_str!("../../../apps/desktop/src-tauri/migrations/0004_session_hosted_ack.sql");
const MIGRATION_0005: &str =
    include_str!("../../../apps/desktop/src-tauri/migrations/0005_pre_meeting_attachment_pages.sql");

pub fn open_and_migrate(path: &Path) -> DatabaseResult<Connection> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

pub fn run_migrations(conn: &Connection) -> DatabaseResult<()> {
    conn.execute_batch(MIGRATION_0001)?;
    apply_migration_0002(conn)?;
    apply_migration_0003(conn)?;
    apply_migration_0004(conn)?;
    apply_migration_0005(conn)?;
    Ok(())
}

fn apply_migration_0002(conn: &Connection) -> DatabaseResult<()> {
    let has_column: bool = conn
        .prepare("PRAGMA table_info(session_contexts)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|name| name == "assistant_preset_id");
    if !has_column {
        conn.execute_batch(MIGRATION_0002)?;
    }
    Ok(())
}

fn apply_migration_0003(conn: &Connection) -> DatabaseResult<()> {
    let has_column: bool = conn
        .prepare("PRAGMA table_info(session_contexts)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|name| name == "pre_meeting_context");
    if !has_column {
        conn.execute_batch(MIGRATION_0003)?;
    }
    Ok(())
}

fn apply_migration_0004(conn: &Connection) -> DatabaseResult<()> {
    let has_column: bool = conn
        .prepare("PRAGMA table_info(sessions)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|name| name == "hosted_data_acknowledged");
    if !has_column {
        conn.execute_batch(MIGRATION_0004)?;
    }
    Ok(())
}

fn apply_migration_0005(conn: &Connection) -> DatabaseResult<()> {
    let has_column: bool = conn
        .prepare("PRAGMA table_info(session_contexts)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|name| name == "pre_meeting_attachment_pages");
    if !has_column {
        conn.execute_batch(MIGRATION_0005)?;
    }
    Ok(())
}

pub fn open_in_memory() -> DatabaseResult<Connection> {
    let conn = Connection::open_in_memory()?;
    run_migrations(&conn)?;
    Ok(conn)
}
