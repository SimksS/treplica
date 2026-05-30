# Research: Treplica Desktop Assistant

## Decision: Use Tauri 2 for the desktop application shell

**Rationale**: Tauri supports cross-platform desktop apps with a Rust backend and web frontend, aligns with a local-first architecture, produces smaller app bundles than browser-bundling shells, and gives the Rust layer a strong boundary for OS integration, audio, file system access, secure storage, and provider orchestration. Official Tauri documentation describes cross-platform support, frontend flexibility, and a security-focused Rust foundation.

**Alternatives considered**:

- **Electron**: Mature and plugin-rich, but ships a browser runtime, typically increases bundle size, and weakens the local-first/performance story for this app.
- **Native Swift + .NET/WinUI**: Strong platform fit but duplicates UI/business logic across macOS and Windows.
- **Flutter desktop**: Cross-platform UI is attractive, but Rust/Tauri gives a better fit for sidecars, audio/native bindings, and security boundaries for this specific app.

## Decision: Use Rust core modules plus TypeScript frontend

**Rationale**: Rust owns sensitive boundaries: audio capture, local persistence, provider requests, credential handling, audit logs, deletion, and sidecar orchestration. TypeScript owns the high-iteration UI surfaces: live session overlay, provider settings, history, documents, and privacy prompts.

**Alternatives considered**:

- **All TypeScript**: Faster initial development but weaker for native integrations and local security boundaries.
- **All Rust UI**: Strong safety but slower UI iteration and less accessible component ecosystem.

## Decision: Store all product data locally in SQLite

**Rationale**: SQLite is embedded, reliable, portable, and easy to inspect for an open-source local-first app. It supports structured records, migrations, and local search indexes for transcript/document history. A single-user desktop database fits the scale better than a server database.

**Alternatives considered**:

- **JSON files only**: Easy to inspect but harder to query, migrate, index, and keep consistent as artifacts grow.
- **External database service**: Conflicts with local-first and no-backend requirements.
- **Custom binary store**: Unnecessary complexity and lower transparency.

## Decision: Use a provider adapter layer with normalized capabilities

**Rationale**: The app must allow OpenAI, Claude, Groq, NVIDIA, Ollama, and similar providers. A provider adapter layer normalizes chat, streaming, translation, summarization, and structured output requests while preserving provider-specific settings. Hosted provider requests must be explicit; local providers such as Ollama should work without sending session data to third-party services.

**Alternatives considered**:

- **Single provider first**: Simpler but contradicts the provider freedom requirement.
- **Direct provider calls from UI**: Faster to prototype but leaks credentials and makes logging/privacy controls inconsistent.
- **Plugin system in v1**: Powerful but too broad; start with built-in adapters plus an internal adapter interface.

## Decision: Support local speech-to-text through whisper.cpp as an optional engine

**Rationale**: whisper.cpp is a widely used local speech-to-text engine designed for efficient local inference and supports Windows/macOS workflows. It keeps transcription local when users want full privacy. Hosted transcription can be added as a provider option, but local transcription should be the default privacy-preserving path.

**Alternatives considered**:

- **Hosted transcription only**: Faster to build but conflicts with local-first positioning.
- **OS speech APIs only**: Good platform integration but inconsistent across Windows/macOS and less portable for open-source contributors.

## Decision: Make stealth/private overlay explicit and best-effort

**Rationale**: The user wants stealth mode fully unlocked. Desktop apps can offer always-on-top, click-through, hotkey-hide, opacity, and private overlay behavior, but capture exclusion depends on OS APIs and meeting platform behavior. The app should implement supported protections, test them, and clearly label limitations rather than promising impossible invisibility.

**Alternatives considered**:

- **No stealth mode**: Contradicts the requested differentiation.
- **Unqualified invisible mode promise**: Risky and inaccurate because OS/platform rules vary.

## Decision: Use local audit logs as a first-class feature

**Rationale**: The user explicitly requested logs of what was done, including documents and actions. Audit logs improve trust in an open-source assistant by showing session lifecycle events, generated artifacts, provider calls, deletion events, errors, and settings changes. Logs must be local, searchable, exportable, and scrub secrets.

**Alternatives considered**:

- **Developer logs only**: Insufficient for user trust and traceability.
- **Cloud telemetry**: Conflicts with local-first requirements.

## Decision: Package signed or unsigned open-source builds for Windows and macOS

**Rationale**: Users need an installable desktop app. The project should support reproducible local builds and release artifacts such as Windows installer and macOS app bundle/DMG. Code signing may be optional for community builds but documented for maintainers.

**Alternatives considered**:

- **Source-only distribution**: Too much friction for target users.
- **Web app**: Cannot meet audio/window/stealth/local-first desktop requirements.

## References

- Product discovery notes (2026-05-22): real-time meeting assistants, local-first desktop, provider-agnostic AI.
- Tauri official documentation: https://tauri.app/
- Tauri start guide: https://v2.tauri.app/start/
- SQLite documentation: https://www.sqlite.org/
- whisper.cpp repository: https://github.com/ggml-org/whisper.cpp
