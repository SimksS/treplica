# Contract: Application Settings (`app_settings.json`)

## Purpose

Document persistent JSON settings outside SQLite. Path: `{app_data_dir}/app_settings.json`.

Managed by `AppSettingsStore` in `storage/app_settings.rs`.

## Schema (`AppSettingsFile`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hosted_warning_acknowledged` | bool | false | User accepted hosted provider warning |
| `stealth_hotkey` | string | `Ctrl+Shift+H` | Global shortcut for stealth toggle |
| `send_transcript_hotkey` | string | `Ctrl+Shift+O` | Shortcut to request guidance from transcript |
| `onboarding_completed` | bool | false | Setup wizard finished |
| `microphone_permission_granted` | bool | false | Onboarding flag |
| `screen_permission_granted` | bool | false | Onboarding flag |
| `transcription_language_mode` | string | `auto` | STT language mode |
| `transcription_language_custom` | string? | null | Custom STT language |
| `model_routing` | `ModelRoutingConfig` | per-task defaults | Provider/model per `ModelTask` |
| `default_snapshot_monitor_id` | u32? | null | Last monitor for screen capture |
| `assistant` | `AssistantPreferences` | empty | Global assistant defaults |
| `documents_export_dir` | string? | null | Custom export root; null = `{app_data}/exports` |

### `AssistantPreferences`

| Field | Description |
|-------|-------------|
| `assistant_preset_id` | Last selected preset |
| `system_prompt` | Custom system instructions |
| `role`, `objective`, `audience` | Context fields |
| `company_or_product_notes` | Product notes |
| `preferred_tone`, `forbidden_topics` | Tone and guardrails |

### `ModelRoutingConfig` (provider-core)

Maps tasks to provider/model:

- `transcription`, `guidance`, `translation`, `vision`, `search`, `summarization`

Configured in **Configurações → Modelos por função** (`ModelRoutingSettingsView`).

## Commands

| Command | Settings touched |
|---------|------------------|
| `get_onboarding_state` / `update_onboarding_state` / `complete_onboarding` | onboarding, permissions, language |
| `get_model_routing` / `update_model_routing` | `model_routing` |
| `get_assistant_preferences` / `save_assistant_preferences` | `assistant` |
| `get_documents_storage_settings` / `set_documents_export_directory` | `documents_export_dir` |
| `get_privacy_settings` | reads `hosted_warning_acknowledged` + SQLite profile |

## Effective export directory

`AppState::exports_root()`:

1. If `documents_export_dir` set and non-empty → use that path (create if missing)
2. Else → `{data_dir}/exports`

Used by `generate_session_document`, `export_session_document`, `delete_session`.

## Contract tests

- Saving assistant prefs survives app restart
- Custom export dir redirects new `.md` files
- Reset export dir restores default path in settings DTO
