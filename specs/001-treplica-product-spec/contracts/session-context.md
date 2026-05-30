# Contract: Session Context & Pre-Meeting Briefing

## Purpose

Define how per-session and global assistant context is stored, updated, and consumed by guidance, vision, and document generation.

## SessionContext (SQLite: `session_contexts`)

| Field (API DTO) | DB column | Description |
|-----------------|-----------|-------------|
| `role` | `role` | Papel do usuário na conversa |
| `objective` | `objective` | Objetivo da reunião |
| `audience` | `audience` | Audiência |
| `company_or_product_notes` | `company_or_product_notes` | Notas de produto/empresa |
| `system_prompt` | `custom_prompts` | Instruções de sistema adicionais |
| `assistant_preset_id` | `assistant_preset_id` | ID do preset (ex. `sales`) |
| `preferred_tone` | `preferred_tone` | Tom preferido |
| `forbidden_topics` | `forbidden_topics` | Tópicos a evitar |
| `pre_meeting_context` | `pre_meeting_context` | Texto de briefing pré-reunião |
| `pre_meeting_context_source` | `pre_meeting_context_source` | Nome do arquivo fonte, se houver |

Migration: `0003_pre_meeting_context.sql`.

## Global assistant preferences (`app_settings.json` → `assistant`)

When the user saves assistant configuration without an active session, fields mirror `SessionContext` (except pre-meeting fields, which are per-session only).

On `update_session_context`, preferences are also written to `app_settings.assistant` for the next session.

## Pre-meeting context flow

1. User opens **Analisar conversa** → `StartMeetingModal`
2. Optional: paste text or import `.txt`, `.md`, `.pdf`
3. `parse_meeting_document` extracts text (PDF via `pdf-extract` no backend)
4. On start: `update_session_context` persists `pre_meeting_context` (+ source)
5. Guidance/vision prompts include a **CONTEXTO PRÉ-REUNIÃO** block when non-empty

UI MUST show that context quality affects guidance quality and that the field is optional.

## Consumption in AI prompts

- `provider-core::prompts::build_user_prompt` — appends pre-meeting block
- `sessions/guidance.rs` — maps DB → `SessionContextInput`
- `sessions/vision.rs` — same mapping for image analysis

## Commands

| Command | Role |
|---------|------|
| `get_session_context` | Read context for active/historical session |
| `update_session_context` | Update session + sync `app_settings.assistant` |
| `get_assistant_preferences` / `save_assistant_preferences` | Global defaults |
| `parse_meeting_document` | Parse uploaded file before session start |

## Contract tests

- Starting a session with preset `sales` sets `assistant_preset_id` and role/objective from preset
- Pre-meeting text appears in `get_session_detail` → context tab
- Empty pre-meeting context does not break guidance
- PDF/txt/md import returns non-empty text or structured error
