PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT,
    default_language TEXT NOT NULL DEFAULT 'pt-BR',
    default_provider_id TEXT,
    privacy_mode TEXT NOT NULL DEFAULT 'local_only',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_configurations (
    id TEXT PRIMARY KEY NOT NULL,
    provider_kind TEXT NOT NULL,
    display_name TEXT NOT NULL,
    base_url TEXT,
    model TEXT,
    capabilities_json TEXT NOT NULL DEFAULT '[]',
    credential_ref TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    local_only INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    source_context_json TEXT,
    source_language TEXT NOT NULL DEFAULT 'pt-BR',
    target_language TEXT,
    stealth_mode_enabled INTEGER NOT NULL DEFAULT 0,
    provider_id TEXT,
    storage_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_contexts (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT,
    objective TEXT,
    audience TEXT,
    company_or_product_notes TEXT,
    custom_prompts TEXT,
    preferred_tone TEXT,
    forbidden_topics TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transcript_segments (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    speaker_label TEXT,
    started_at_ms INTEGER NOT NULL,
    ended_at_ms INTEGER NOT NULL,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    confidence REAL NOT NULL,
    is_uncertain INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translation_segments (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    transcript_segment_id TEXT NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    text TEXT NOT NULL,
    confidence REAL NOT NULL,
    is_uncertain INTEGER NOT NULL DEFAULT 0,
    provider_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guidance_suggestions (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    trigger_segment_ids_json TEXT,
    suggestion_type TEXT NOT NULL,
    text TEXT NOT NULL,
    rationale TEXT,
    confidence REAL NOT NULL,
    provider_id TEXT,
    shown_at TEXT,
    copied_at TEXT,
    saved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_calls (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    provider_id TEXT,
    purpose TEXT NOT NULL,
    local_or_hosted TEXT NOT NULL,
    request_started_at TEXT NOT NULL,
    request_finished_at TEXT,
    status TEXT NOT NULL,
    latency_ms INTEGER,
    input_bytes INTEGER,
    output_bytes INTEGER,
    error_code TEXT,
    redaction_summary TEXT
);

CREATE TABLE IF NOT EXISTS generated_documents (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'markdown',
    storage_path TEXT,
    provider_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log_entries (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    severity TEXT NOT NULL DEFAULT 'info',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_transcript_session ON transcript_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_guidance_session ON guidance_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log_entries(session_id);
