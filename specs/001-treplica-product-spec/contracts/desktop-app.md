# Contract: Desktop App Surfaces

> Mapa completo: [ecosystem.md](../ecosystem.md)

## Purpose

Define user-facing desktop surfaces that must exist for the Windows/macOS installable app.

## Home Dashboard

MUST provide:

- Current assistant preset summary and link to configure assistant.
- Recent sessions list with link to full history.
- **Analisar conversa** → opens start-meeting modal (preset + optional pre-meeting context).
- Other quick actions (capture screen, ask) may start session without modal.
- Link to stealth settings and history search.

## Start Meeting Modal

MUST provide:

- Assistant preset selection (cards).
- Optional pre-meeting context: textarea + file import (PDF, Markdown, text).
- Notice that context improves guidance but is optional.
- Confirm cancels or starts session and opens stealth overlay (or live view fallback).

## Live Assistant Window

MUST provide:

- Start, pause, resume, end session controls.
- Listening, paused, reconnecting, error, and ended states.
- Live transcript stream (mic, cloud STT, system audio paths as configured).
- Translation panel when enabled.
- Guidance suggestion panel with AI activity indicator.
- Copy/save actions for useful suggestions.
- Session context editor / assistant config entry point.
- Screen snapshot / image upload for vision analysis when enabled.
- Clear indicator when content may be sent to a hosted provider.

## Stealth or Private Overlay

MUST provide:

- Full live workspace (transcript, guidance, translation) in compact overlay.
- Toggle for private overlay mode.
- Always-on-top behavior where supported.
- Fast hide/show hotkey (`stealth_hotkey`, default `Ctrl+Shift+H`).
- Guidance hotkey (`send_transcript_hotkey`, default `Ctrl+Shift+O`).
- Optional reduced opacity and compact mode.
- Clear status showing whether capture exclusion is active, unsupported, or unknown.
- Warning that behavior depends on OS and meeting platform support.
- Same leave-session confirmation as main window when hiding/closing with active session.

## Session Leave Confirmation

MUST provide:

- Modal when leaving active session via navigation, main window close, or overlay hide.
- Actions: end session, keep active in background, cancel.

## Provider Settings

MUST provide:

- Provider list with local/hosted labels and preset cards.
- Add/edit/test provider configuration via modal.
- Model selection per provider.
- Privacy mode controls (see Privacy settings).
- Credential entry using secure storage.
- Error states for invalid, offline, or unauthorized providers.

## Model Routing Settings

MUST provide:

- Assignment of provider + model per task: transcription, guidance, translation, vision, search, summarization.
- Test action per task where applicable.

## Privacy Settings

MUST provide:

- Privacy mode selection (`local_only`, `hosted_per_session`, `hosted_default`).
- Hosted provider warning acknowledgment flow.

## Data Storage Settings

MUST provide:

- Display effective and default export directories.
- Pick custom export folder (native dialog).
- Reset to default app data exports path.
- Open export folder in OS file manager.
- Import Treplica `.md` documents from a folder with result summary.

## Stealth Settings (configuration)

MUST provide:

- Stealth overlay toggle and always-on-top.
- Capture exclusion status display.
- Hotkey configuration reference.

## Onboarding Wizard

MUST provide:

- First-run flow: permissions, transcription language, provider test, hotkey info.
- Blocks main app until completed or explicitly finished.

## History and Documents

MUST provide:

- Session list with date, title, status, counts, **assistant preset filter**, text search, rename.
- Session detail with tabs: **Conversa**, **Contexto**, **Orientações**, **Traduções**, **Auditoria**, **Documentos**.
- Context tab shows preset, session config, pre-meeting briefing.
- Generate summary/document actions.
- Export document action (writes/rewrites `.md` under effective export root).
- Delete session and delete document actions.

## Assistant Configuration Modal

MUST provide:

- Preset sidebar, system prompt editor, context fields.
- Save to active session or global preferences when no session.

## Contract Tests

- A user can start a session from a fresh install without an account.
- Start-meeting modal sets preset and optional briefing on new session.
- A user can configure one local provider and one hosted provider.
- Privacy warning appears before the first hosted provider request.
- The live assistant shows a provider failure without losing transcript data.
- The stealth overlay status distinguishes supported, unsupported, and unknown capture behavior.
- Leaving active session shows confirmation modal.
- History filter by assistant preset returns correct subset.
- Custom export directory receives new generated documents.
- Import restores documents and creates placeholder sessions when needed.
