# Quickstart: Treplica Desktop Assistant

## Goal

Validate the planned desktop app end to end: installable shell, local session data, configurable AI providers, real-time assistant flow, logs, generated documents, deletion, and packaging.

## Prerequisites

- Windows 10+ or macOS 12+ development machine.
- Rust stable toolchain.
- Node.js LTS and package manager selected by the repository.
- Tauri prerequisites for the target OS.
- Optional local AI runtime such as Ollama.
- Optional whisper.cpp model files for local speech-to-text testing.
- Optional hosted provider API key for OpenAI, Claude, Groq, NVIDIA, or OpenAI-compatible providers.

## Setup

1. Install dependencies for the desktop workspace.
2. Build the Rust crates and run unit tests.
3. Start the desktop app in development mode.
4. Open provider settings.
5. Configure a local provider.
6. Optionally configure a hosted provider and confirm the privacy warning.

## Primary Validation Flow

1. Launch the app without creating an account.
2. Complete onboarding wizard if shown.
3. Click **Analisar conversa** on home dashboard.
4. Select assistant preset (e.g. sales) and optionally paste or import pre-meeting briefing.
5. Confirm start — stealth overlay or live view opens.
6. Start listening.
7. Feed sample meeting audio or a simulated transcript.
8. Confirm transcript segments appear.
9. Enable translation and confirm translated segments appear.
10. Trigger a difficult question or objection.
11. Confirm guidance appears quickly and is labeled with confidence when uncertain.
12. Optional: capture screen snapshot and confirm vision guidance.
13. Copy or save one suggestion.
14. Attempt to navigate home — confirm leave-session modal; choose keep active or end.
15. End the session.
16. Generate a session summary and a follow-up document.
17. Open history; filter by assistant preset; open session detail.
18. Verify tabs: Conversa, **Contexto** (preset + briefing), Orientações, Documentos, Auditoria.
19. Export a generated document.
20. In **Arquivos e backup**, set custom export folder and confirm path.
21. Optional: import documents from export folder on a fresh DB profile.
22. Delete the session and verify associated local data is removed.

## Privacy Validation

1. Set privacy mode to local-only.
2. Attempt to use a hosted provider.
3. Confirm the request is blocked before content leaves the machine.
4. Switch to hosted-allowed-per-session.
5. Confirm the app asks for approval before the hosted request.
6. Inspect local audit logs and verify the provider call is recorded without credentials.

## Stealth Overlay Validation

1. Enable private overlay.
2. Confirm always-on-top behavior.
3. Use the hide/show hotkey.
4. Start screen sharing in a supported meeting app.
5. Confirm the app reports capture exclusion as active, unsupported, or unknown.
6. Confirm the UI does not promise invisibility when the platform cannot guarantee it.

## Packaging Validation

1. Build a Windows installer artifact.
2. Build a macOS app bundle or DMG artifact.
3. Install each artifact on a clean machine or clean profile.
4. Launch the app.
5. Confirm local storage is created under the user application data directory.
6. Confirm uninstall does not silently upload or sync user data.

## Success Checks

- No account or subscription gate blocks core features.
- Meeting count, session length, provider choice, stealth mode, and history are not artificially limited.
- Session data, documents, logs, settings, and credentials stay local except explicit hosted provider requests.
- Relevant automated tests pass before implementation is considered complete.
