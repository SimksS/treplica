# Data Model: Treplica Desktop Assistant

> Ver também: [ecosystem.md](./ecosystem.md) para fluxos e mapa de módulos.  
> Configurações JSON: [contracts/app-settings.md](./contracts/app-settings.md).

## UserProfile

Stores local user preferences without requiring an account.

**Fields**:

- `id`: Local stable identifier.
- `display_name`: Optional local name for generated documents.
- `default_language`: Preferred UI and translation language.
- `default_provider_id`: Preferred AI provider.
- `privacy_mode`: Local-only, hosted-allowed-per-session, or hosted-allowed-by-default.
- `created_at`, `updated_at`.

**Validation**:

- Must exist before the first session starts.
- Hosted provider usage must respect `privacy_mode`.

## Session

Represents a live or completed meeting assistance event.

**Fields**:

- `id`
- `title`
- `status`: `draft`, `listening`, `paused`, `reconnecting`, `ended`, `failed`, `deleted`
- `started_at`, `ended_at`
- `source_context`: meeting type, user role, audience, objective, product/company notes.
- `source_language`: detected or user-selected language.
- `target_language`
- `stealth_mode_enabled`
- `provider_id`
- `storage_path`: Reserved column; not populated in current builds (export location is global via `documents_export_dir`).
- `created_at`, `updated_at`

**Relationships**:

- Has many `TranscriptSegment`, `TranslationSegment`, `GuidanceSuggestion`, `GeneratedDocument`, and `AuditLogEntry`.
- Has one active `SessionContext`.

**State transitions**:

- `draft` -> `listening`
- `listening` -> `paused`
- `paused` -> `listening`
- `listening` or `paused` -> `reconnecting`
- `reconnecting` -> `listening` or `failed`
- `listening`, `paused`, or `failed` -> `ended`
- Any non-deleted state -> `deleted`

## SessionContext

User-provided background that guides assistant output.

**Fields**:

- `id`
- `session_id`
- `role`
- `objective`
- `audience`
- `company_or_product_notes`
- `custom_prompts` (exposed as `system_prompt` in API DTOs)
- `assistant_preset_id`: Built-in preset id (`note-taker`, `sales`, `interview`, `general`)
- `preferred_tone`
- `forbidden_topics`
- `pre_meeting_context`: Optional briefing text supplied before the meeting
- `pre_meeting_context_source`: Optional filename label (e.g. `briefing.pdf`)
- `created_at`, `updated_at`

**Validation**:

- Empty context is allowed, but guidance must mark lower confidence when context is insufficient.
- Pre-meeting context is optional; UI must state that guidance quality improves with richer briefing.
- Sensitive fields must not be written to plain debug logs.

## AppSettingsFile (JSON, not SQLite)

Stored at `{app_data_dir}/app_settings.json`. See [contracts/app-settings.md](./contracts/app-settings.md).

**Key sections**:

- `assistant`: Global assistant defaults (mirrors session context fields except pre-meeting)
- `model_routing`: Per-task provider/model assignment
- `documents_export_dir`: Optional override for export root
- Onboarding flags, hotkeys, snapshot monitor id

## TranscriptSegment

Recognized speech segment.

**Fields**:

- `id`
- `session_id`
- `speaker_label`
- `started_at_ms`, `ended_at_ms`
- `language`
- `text`
- `confidence`
- `is_uncertain`
- `source`: local engine, hosted provider, imported text, or manual edit.
- `created_at`

**Validation**:

- Must belong to a session.
- Low confidence segments must be flagged for UI display and downstream prompts.

## TranslationSegment

Translation of a transcript segment.

**Fields**:

- `id`
- `session_id`
- `transcript_segment_id`
- `source_language`
- `target_language`
- `text`
- `confidence`
- `is_uncertain`
- `provider_id`
- `created_at`

**Validation**:

- Must reference an existing transcript segment.
- Target language must be set before translation begins.

## GuidanceSuggestion

Real-time response help shown to the user.

**Fields**:

- `id`
- `session_id`
- `trigger_segment_ids`
- `type`: answer, objection_response, follow_up_question, talking_point, next_step, fallback.
- `text`
- `rationale`
- `confidence`
- `provider_id`
- `shown_at`
- `copied_at`
- `saved`
- `created_at`

**Validation**:

- Must never be marked as verified fact unless grounded in session context or transcript.
- Low-confidence guidance must be labeled in the UI.

## AIProviderConfiguration

User-controlled provider settings.

**Fields**:

- `id`
- `provider_kind`: ollama, openai, anthropic, groq, nvidia, openai_compatible, custom.
- `display_name`
- `base_url`
- `model`
- `capabilities`: chat, streaming, translation, summarization, embeddings, transcription.
- `credential_ref`: reference to OS secret storage, never the raw key.
- `enabled`
- `local_only`
- `created_at`, `updated_at`

**Validation**:

- Hosted providers must show a privacy warning before first use.
- Credentials must not be exported with normal settings backups.

## ProviderCall

Local record of a request to an AI provider.

**Fields**:

- `id`
- `session_id`
- `provider_id`
- `purpose`: transcription, translation, guidance, summary, document_generation, **vision**.
- `local_or_hosted`
- `request_started_at`, `request_finished_at`
- `status`: success, failed, cancelled, redacted.
- `latency_ms`
- `input_bytes`
- `output_bytes`
- `error_code`
- `redaction_summary`

**Validation**:

- Must not store raw credentials.
- Raw prompt/response storage is controlled by privacy settings; audit metadata is stored regardless.

## GeneratedDocument

Local artifact created from a session.

**Fields**:

- `id`
- `session_id`
- `type`: summary, follow_up_email, transcript_export, objection_analysis, notes, custom.
- `title`
- `content`
- `format`: markdown (implemented); plain_text, pdf, docx (planned).
- `storage_path`: Absolute path to exported `.md` when written to disk.
- `provider_id`
- `created_at`, `updated_at`

**Validation**:

- Must be deletable with the parent session or independently by the user.
- Exported documents must include provenance metadata unless the user disables it.

## AuditLogEntry

Local trace of meaningful app activity.

**Fields**:

- `id`
- `session_id`
- `category`: session, audio, provider, document, settings, privacy, deletion, error.
- `action`
- `details_json`
- `severity`: info, warning, error.
- `created_at`

**Validation**:

- Must be append-only except for user-requested deletion or log retention cleanup.
- Must scrub secrets, full API keys, and sensitive raw payloads by default.

## DeletionRequest

Tracks local deletion work for sessions and artifacts.

**Fields**:

- `id`
- `target_type`
- `target_id`
- `requested_at`
- `completed_at`
- `status`: queued, completed, failed.
- `failure_reason`

**Validation**:

- Deletion must remove database rows, local files, search indexes, cached provider outputs, and associated logs according to retention policy.

## Database migrations

Applied from `apps/desktop/src-tauri/migrations/` on startup:

| Migration | Changes |
|-----------|---------|
| `0001_initial.sql` | Core schema: sessions, contexts, transcripts, guidance, documents, audit |
| `0002_system_prompt_and_routing.sql` | `assistant_preset_id` on `session_contexts` |
| `0003_pre_meeting_context.sql` | `pre_meeting_context`, `pre_meeting_context_source` |
