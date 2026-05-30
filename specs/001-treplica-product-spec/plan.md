# Implementation Plan: Treplica Desktop Assistant

**Branch**: `001-treplica-product-spec` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-treplica-product-spec/spec.md` plus planning input: desktop installable for Windows and macOS, open source, no artificial limits, provider-agnostic AI, local-first data, local logs and generated documents.

## Summary

Build Treplica, an open-source, local-first desktop assistant: a Windows/macOS installable app that listens to live meetings, transcribes and translates speech, provides real-time response guidance, supports stealth/private overlay behavior where the OS and meeting platform allow it, and stores session history, generated documents, logs, settings, and credentials locally. The technical approach uses a Tauri desktop shell with a Rust core for OS integration, audio capture, local persistence, provider orchestration, audit logging, and secure command boundaries, plus a web frontend for the live assistant UI and settings.

## Technical Context

**Language/Version**: Rust stable for Tauri core and local services; TypeScript stable for frontend UI; SQL migrations for local persistence.

**Primary Dependencies**: Tauri 2 desktop framework; frontend built with Vite + React; SQLite via a Rust SQLite binding; provider adapters for OpenAI-compatible APIs, Anthropic Claude, Groq, NVIDIA endpoints, and Ollama/local OpenAI-compatible runtimes; optional local speech-to-text through whisper.cpp sidecar or native binding.

**Storage**: Local SQLite database in the user's application data directory for sessions, transcripts, translations, suggestions, generated documents, audit logs, provider settings metadata, and indexes. Local encrypted credential storage through OS-backed secret storage where available; never store provider secrets in plaintext logs.

**Testing**: Rust unit and integration tests; TypeScript unit/component tests; Playwright or WebDriver-style desktop UI smoke tests; contract tests for provider adapters using deterministic fixtures; packaging smoke tests for Windows and macOS release artifacts.

**Target Platform**: Windows 10+ and macOS 12+ for the first supported release. Linux may be kept possible by architecture but is not required for v1 acceptance.

**Project Type**: Cross-platform desktop application with local services and no required backend.

**Performance Goals**: Show live transcript updates within 1 second of recognized speech in normal conditions; show guidance suggestions within 3 seconds after a meaningful prompt or objection is detected; keep steady-state UI interaction responsive under 100 ms for local navigation; keep local search across 1,000 sessions under 1 second for common queries.

**Constraints**: Local-first by default; no account required; no artificial product caps; provider requests leave the machine only when the user configures and selects a hosted provider; stealth/private overlay is best-effort and must be explicit about OS/platform limitations; all session artifacts must be deletable locally; provider failures must not corrupt session data.

**Scale/Scope**: Single-user desktop app, unlimited local sessions bounded only by local machine storage and provider/model capacity. Initial scope includes live session assistant, translation, provider settings, local history, audit logs, generated documents, privacy controls, and Windows/macOS packaging.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Is a Product Requirement**: PASS. The plan separates desktop shell, Rust core, provider adapters, local persistence, and UI surfaces. New abstractions are justified by provider diversity and local-first security boundaries.
- **Tests Define the Contract**: PASS. The plan requires unit, integration, UI smoke, packaging, and provider contract tests before completion.
- **User Experience Must Stay Consistent**: PASS. The plan includes explicit live states, settings flows, stealth limitations, privacy notices, and generated document/history flows.
- **Performance Has Explicit Budgets**: PASS. Transcript, suggestion, navigation, and search budgets are defined and must be verified.
- **Simplicity, Traceability, and Incremental Delivery**: PASS. Work is split by independently testable user stories and documented contracts.

Post-design re-check: PASS. The research, data model, contracts, and quickstart preserve all gates and add no unresolved violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-treplica-product-spec/
|-- spec.md
|-- ecosystem.md          # Mapa do sistema (leia primeiro)
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- verification.md
|-- contracts/
|   |-- provider-adapter.md
|   |-- local-data.md
|   |-- desktop-app.md
|   |-- session-context.md
|   |-- assistant-presets.md
|   `-- app-settings.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
apps/
`-- desktop/
    |-- src-tauri/
    |   |-- src/
    |   |   |-- audio/
    |   |   |-- commands/
    |   |   |-- documents/
    |   |   |-- logging/
    |   |   |-- providers/
    |   |   |-- sessions/
    |   |   |-- stealth/
    |   |   `-- storage/
    |   |-- migrations/
    |   |-- sidecars/
    |   `-- tauri.conf.json
    |-- src/
    |   |-- app/
    |   |-- components/
    |   |-- features/
    |   |   |-- live-session/
    |   |   |-- providers/
    |   |   |-- history/
    |   |   |-- documents/
    |   |   `-- settings/
    |   |-- lib/
    |   `-- styles/
    |-- tests/
    |   |-- component/
    |   |-- e2e/
    |   `-- fixtures/
    `-- package.json

crates/
|-- provider-core/
|-- local-store/
`-- audio-core/

tests/
|-- contract/
|-- integration/
`-- packaging/

docs/
|-- privacy.md
|-- provider-setup.md
`-- building-from-source.md
```

**Structure Decision**: Use a Tauri desktop workspace because the product must be installable on Windows/macOS, local-first, open source, and deeply integrated with OS audio/window/storage behavior. Shared Rust crates isolate provider orchestration, local storage, and audio work from the Tauri command layer, making unit and contract tests possible without launching the UI.

## Complexity Tracking

No constitution violations.
