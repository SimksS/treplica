# Contract: Assistant Presets

## Purpose

Named assistant profiles that seed session context and system prompts for common meeting types.

## Built-in presets

Defined in `apps/desktop/src/features/assistants/assistantPresets.ts`:

| ID | Nome | Uso típico |
|----|------|------------|
| `note-taker` | Anotador de reunião | Action items, decisões |
| `sales` | Assistente de vendas | Objeções, avanço de oportunidade |
| `interview` | Entrevista técnica | Perguntas de follow-up |
| `general` | Assistente geral | Conversas genéricas |

Each preset provides:

- `form`: default `role`, `objective`, `audience`, `preferred_tone`, `forbidden_topics`
- `systemPrompt`: XML-tagged instructions merged into the effective system prompt

## UI surfaces

| Surface | Behavior |
|---------|----------|
| `StartMeetingModal` | User **must** pick preset before first analyze flow |
| `AssistantConfigModal` | Edit preset + custom system prompt; saves to session or global prefs |
| `HomeDashboard` | Shows current preset from `assistant_prefs` |
| `HistoryContextTab` | Displays preset used for past session |

## Persistence

- Per session: `session_contexts.assistant_preset_id` + fields from `buildMeetingStartInput(presetId)`
- Global default: `app_settings.assistant.assistant_preset_id`

## History filter

`list_session_history` accepts `assistant_preset_filter`:

- `all` — no filter
- `unset` — sessions without preset
- `{preset_id}` — exact match on `session_contexts.assistant_preset_id`

## Guidance classification

`guidance_classifier.rs` uses `assistant_preset_id` and context fields to bias scenario hints (sales, interview, etc.).

## Contract tests

- Selecting `sales` in start modal sets `assistant_preset_id: "sales"` on new session
- History filter `sales` returns only matching sessions
- Changing preset in config modal updates `app_settings` when no live session
