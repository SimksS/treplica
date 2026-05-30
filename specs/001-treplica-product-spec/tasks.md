---
description: "Task list for Treplica desktop assistant implementation"
---

# Tasks: Treplica Desktop Assistant

**Input**: Design documents from `specs/001-treplica-product-spec/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Required by the project constitution. Each user story includes contract, integration, and UI-oriented verification tasks where applicable.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after shared foundations are complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: Maps a task to a user story from [spec.md](./spec.md).
- Every task includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the desktop workspace, shared crates, baseline tooling, and documentation skeleton.

- [X] T001 Create the root workspace manifest for the desktop app and Rust crates in `Cargo.toml`
- [X] T002 Create the Tauri desktop package manifest and scripts in `apps/desktop/package.json`
- [X] T003 Create the Tauri app configuration for Windows/macOS targets in `apps/desktop/src-tauri/tauri.conf.json`
- [X] T004 [P] Create the frontend Vite/React/TypeScript configuration in `apps/desktop/vite.config.ts`
- [X] T005 [P] Create the frontend TypeScript configuration in `apps/desktop/tsconfig.json`
- [X] T006 [P] Create the frontend entry point in `apps/desktop/src/app/main.tsx`
- [X] T007 [P] Create the base application shell component in `apps/desktop/src/app/App.tsx`
- [X] T008 [P] Create shared styling tokens and layout CSS in `apps/desktop/src/styles/global.css`
- [X] T009 Create the Rust Tauri entry point and command registration shell in `apps/desktop/src-tauri/src/main.rs`
- [X] T010 [P] Create the provider core crate manifest in `crates/provider-core/Cargo.toml`
- [X] T011 [P] Create the local store crate manifest in `crates/local-store/Cargo.toml`
- [X] T012 [P] Create the audio core crate manifest in `crates/audio-core/Cargo.toml`
- [X] T013 [P] Create repository contributor setup docs in `docs/building-from-source.md`
- [X] T014 [P] Create provider setup documentation skeleton in `docs/provider-setup.md`
- [X] T015 [P] Create privacy behavior documentation skeleton in `docs/privacy.md`

**Checkpoint**: Project scaffolding exists and supports future implementation tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish local-first storage, provider abstraction, audit logging, desktop command boundaries, and test fixtures required by all user stories.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T016 Create SQLite migration for user profiles, provider configs, sessions, context, transcripts, translations, suggestions, provider calls, documents, audit logs, and deletion requests in `apps/desktop/src-tauri/migrations/0001_initial.sql`
- [X] T017 Create local store connection and migration runner in `crates/local-store/src/database.rs`
- [X] T018 [P] Define local store entity models from data-model.md in `crates/local-store/src/models.rs`
- [X] T019 [P] Implement local store repositories for sessions, transcripts, translations, suggestions, documents, provider calls, and audit logs in `crates/local-store/src/repositories.rs`
- [X] T020 Add local store unit tests for migrations and repository CRUD behavior in `crates/local-store/tests/local_store_tests.rs`
- [X] T021 Define provider adapter traits, capability metadata, request types, and error types in `crates/provider-core/src/lib.rs`
- [X] T022 [P] Implement OpenAI-compatible provider adapter baseline in `crates/provider-core/src/openai_compatible.rs`
- [X] T023 [P] Implement Ollama provider adapter baseline in `crates/provider-core/src/ollama.rs`
- [X] T024 [P] Implement hosted provider configuration structs for OpenAI, Anthropic, Groq, and NVIDIA in `crates/provider-core/src/hosted.rs`
- [X] T025 Add provider contract tests for privacy blocking, validation, cancellation, and structured errors in `tests/contract/provider_adapter_contract.rs`
- [X] T026 Implement credential reference abstraction for OS-backed secret storage in `apps/desktop/src-tauri/src/storage/credentials.rs`
- [X] T027 Implement audit log writer with secret scrubbing in `apps/desktop/src-tauri/src/logging/audit.rs`
- [X] T028 Add audit log contract tests for secret scrubbing and hosted provider metadata in `tests/contract/local_data_contract.rs`
- [X] T029 Implement Tauri command error mapping and response envelope in `apps/desktop/src-tauri/src/commands/mod.rs`
- [X] T030 Implement frontend Tauri command client wrapper in `apps/desktop/src/lib/tauriClient.ts`
- [X] T031 [P] Define frontend domain types matching local models and provider contracts in `apps/desktop/src/lib/types.ts`
- [X] T032 [P] Create deterministic transcript, provider, and session fixtures in `apps/desktop/tests/fixtures/session-fixtures.ts`
- [X] T033 [P] Create Rust fixture data for provider and store tests in `tests/fixtures/provider_fixtures.json`
- [X] T034 Configure frontend test runner and component test setup in `apps/desktop/src/test/setup.ts`

**Checkpoint**: Foundation ready. Local persistence, provider abstractions, audit logging, command boundaries, and fixtures are available.

---

## Phase 3: User Story 1 - Receive Real-Time Guidance During A Meeting (Priority: P1)

**Goal**: A user can start a live session, capture or simulate speech, see transcript segments, receive contextual guidance, and save/copy suggestions fast enough to use during a conversation.

**Independent Test**: Start a simulated meeting, feed sample speech or transcript events, and verify transcript updates plus contextual suggestions appear in the live assistant window within the planned performance budget.

### Tests for User Story 1

- [X] T035 [P] [US1] Add Rust integration test for session lifecycle start, pause, resume, end, and audit events in `tests/integration/live_session_lifecycle.rs`
- [X] T036 [P] [US1] Add provider contract test for guidance request grounding and low-confidence fallback in `tests/contract/guidance_contract.rs`
- [X] T037 [P] [US1] Add frontend component test for live session states and suggestion actions in `apps/desktop/tests/component/live-session.test.tsx`
- [X] T038 [P] [US1] Add desktop smoke test for fresh install start-session flow in `apps/desktop/tests/e2e/live-guidance.spec.ts`

### Implementation for User Story 1

- [X] T039 [P] [US1] Implement session state service and transitions in `apps/desktop/src-tauri/src/sessions/service.rs`
- [X] T040 [P] [US1] Implement audio capture abstraction and simulated transcript source in `crates/audio-core/src/lib.rs`
- [X] T041 [P] [US1] Implement live transcript ingestion and persistence in `apps/desktop/src-tauri/src/audio/transcription.rs`
- [X] T042 [US1] Implement guidance orchestration using session context, recent transcript, provider adapter, and audit logging in `apps/desktop/src-tauri/src/sessions/guidance.rs`
- [X] T043 [US1] Expose start, pause, resume, end, append transcript, and request guidance commands in `apps/desktop/src-tauri/src/commands/session_commands.rs`
- [X] T044 [P] [US1] Build live session state management hook in `apps/desktop/src/features/live-session/useLiveSession.ts`
- [X] T045 [P] [US1] Build live transcript stream component in `apps/desktop/src/features/live-session/TranscriptStream.tsx`
- [X] T046 [P] [US1] Build guidance suggestion panel with confidence labels and copy/save actions in `apps/desktop/src/features/live-session/GuidancePanel.tsx`
- [X] T047 [US1] Build live assistant window with session controls and status states in `apps/desktop/src/features/live-session/LiveAssistantView.tsx`
- [X] T048 [US1] Wire live assistant route into application shell in `apps/desktop/src/app/App.tsx`
- [X] T049 [US1] Persist copied and saved suggestion events with audit log entries in `apps/desktop/src-tauri/src/sessions/suggestions.rs`

**Checkpoint**: US1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Translate Live Conversations (Priority: P2)

**Goal**: A user can select a target language and see original transcript plus translated text during an active session, with uncertainty clearly labeled.

**Independent Test**: Run a simulated multilingual conversation and verify translated segments appear in the selected language while uncertain speech is marked as uncertain.

### Tests for User Story 2

- [X] T050 [P] [US2] Add provider contract test for translation requests, confidence, and uncertainty output in `tests/contract/translation_contract.rs`
- [X] T051 [P] [US2] Add Rust integration test for transcript-to-translation persistence in `tests/integration/live_translation.rs`
- [X] T052 [P] [US2] Add frontend component test for language selection and translation panel states in `apps/desktop/tests/component/translation-panel.test.tsx`

### Implementation for User Story 2

- [X] T053 [P] [US2] Implement translation service using provider adapters and privacy settings in `apps/desktop/src-tauri/src/sessions/translation.rs`
- [X] T054 [US2] Add translation commands for target language selection and segment translation in `apps/desktop/src-tauri/src/commands/translation_commands.rs`
- [X] T055 [P] [US2] Implement translation segment repository methods in `crates/local-store/src/translation_repository.rs`
- [X] T056 [P] [US2] Build language selector component in `apps/desktop/src/features/live-session/LanguageSelector.tsx`
- [X] T057 [P] [US2] Build translation panel with original, translated, and uncertain segment states in `apps/desktop/src/features/live-session/TranslationPanel.tsx`
- [X] T058 [US2] Integrate translation controls into the live assistant window in `apps/desktop/src/features/live-session/LiveAssistantView.tsx`
- [X] T059 [US2] Add translation audit events for hosted provider use and low-confidence translations in `apps/desktop/src-tauri/src/logging/audit.rs`

**Checkpoint**: US2 works independently on top of the shared live session foundation.

---

## Phase 5: User Story 3 - Handle Objections And Follow-Up Moments (Priority: P3)

**Goal**: A user receives persuasive objection responses, follow-up questions, talking points, and next-step prompts tailored to sales, interviews, leadership, and presentations.

**Independent Test**: Feed sample objections or unexpected answers and verify the assistant returns actionable replies, follow-up questions, and next steps that are grounded in session context.

### Tests for User Story 3

- [X] T060 [P] [US3] Add provider contract test for objection response structured output in `tests/contract/objection_guidance_contract.rs`
- [X] T061 [P] [US3] Add Rust integration test for objection trigger detection and suggestion persistence in `tests/integration/objection_flow.rs`
- [X] T062 [P] [US3] Add frontend component test for objection and follow-up suggestion categories in `apps/desktop/tests/component/guidance-categories.test.tsx`

### Implementation for User Story 3

- [X] T063 [P] [US3] Implement guidance classification for answer, objection_response, follow_up_question, talking_point, next_step, and fallback in `apps/desktop/src-tauri/src/sessions/guidance_classifier.rs`
- [X] T064 [US3] Extend guidance orchestration with scenario-specific prompts for sales, interviews, leadership, and presentations in `apps/desktop/src-tauri/src/sessions/guidance.rs`
- [X] T065 [P] [US3] Implement session context editor commands for role, objective, audience, product notes, tone, and forbidden topics in `apps/desktop/src-tauri/src/commands/context_commands.rs`
- [X] T066 [P] [US3] Build session context editor UI in `apps/desktop/src/features/live-session/SessionContextEditor.tsx`
- [X] T067 [P] [US3] Build guidance category filters and next-step display in `apps/desktop/src/features/live-session/GuidancePanel.tsx`
- [X] T068 [US3] Add objection and follow-up audit events in `apps/desktop/src-tauri/src/logging/audit.rs`
- [X] T069 [US3] Update live assistant flow to refresh suggestions when context changes in `apps/desktop/src/features/live-session/useLiveSession.ts`

**Checkpoint**: US3 adds richer guidance while preserving the independently testable US1 flow.

---

## Phase 6: User Story 4 - Review Session Outcomes After A Conversation (Priority: P4)

**Goal**: After a session, a user can review history, inspect transcript/suggestions/audit events, generate summaries and documents, export artifacts, and delete local data.

**Independent Test**: Complete a simulated session, generate a summary and follow-up document, verify history details and audit entries, export a document, then delete the session and confirm related data is removed.

### Tests for User Story 4

- [X] T070 [P] [US4] Add local data contract test for session deletion and app-managed file cleanup in `tests/contract/local_deletion_contract.rs`
- [X] T071 [P] [US4] Add provider contract test for summary and document generation output in `tests/contract/document_generation_contract.rs`
- [X] T072 [P] [US4] Add Rust integration test for history, document generation, export, and audit events in `tests/integration/session_review.rs`
- [X] T073 [P] [US4] Add frontend component test for history list, session detail, documents, and deletion states in `apps/desktop/tests/component/history-documents.test.tsx`

### Implementation for User Story 4

- [X] T074 [P] [US4] Implement generated document service for summaries, follow-ups, notes, and transcript exports in `apps/desktop/src-tauri/src/documents/service.rs`
- [X] T075 [P] [US4] Implement document file writer and export metadata in `apps/desktop/src-tauri/src/documents/export.rs`
- [X] T076 [P] [US4] Implement history query and local search repository methods in `crates/local-store/src/history_repository.rs`
- [X] T077 [P] [US4] Implement deletion service for sessions, artifacts, indexes, caches, and deletion audit entries in `apps/desktop/src-tauri/src/storage/deletion.rs`
- [X] T078 [US4] Expose history, document generation, export, and deletion commands in `apps/desktop/src-tauri/src/commands/history_commands.rs`
- [X] T079 [P] [US4] Build session history list UI in `apps/desktop/src/features/history/SessionHistoryView.tsx`
- [X] T080 [P] [US4] Build session detail UI with transcript, translations, suggestions, provider calls, documents, and audit events in `apps/desktop/src/features/history/SessionDetailView.tsx`
- [X] T081 [P] [US4] Build generated documents panel with create, export, copy, and delete actions in `apps/desktop/src/features/documents/DocumentsPanel.tsx`
- [X] T082 [US4] Integrate history and document routes into the application shell in `apps/desktop/src/app/App.tsx`
- [X] T083 [US4] Add user-facing deletion confirmation and success/error states in `apps/desktop/src/features/history/DeleteSessionDialog.tsx`

**Checkpoint**: US4 completes the session lifecycle from live assistance through review, export, and deletion.

---

## Phase 7: Provider Settings, Privacy, And Stealth Desktop Surface

**Purpose**: Complete cross-story product requirements for provider choice, local-first privacy controls, and private overlay behavior.

- [X] T084 [P] Add provider settings tests for local and hosted provider setup in `apps/desktop/tests/component/provider-settings.test.tsx`
- [X] T085 [P] Add desktop smoke test for privacy warning before first hosted provider request in `apps/desktop/tests/e2e/provider-privacy.spec.ts`
- [X] T086 [P] Add desktop smoke test for stealth overlay status states in `apps/desktop/tests/e2e/stealth-overlay.spec.ts`
- [X] T087 Implement provider settings commands for create, update, test, enable, disable, and delete in `apps/desktop/src-tauri/src/commands/provider_commands.rs`
- [X] T088 Build provider settings UI with local/hosted labels, model selection, credentials, and validation errors in `apps/desktop/src/features/providers/ProviderSettingsView.tsx`
- [X] T089 Build privacy mode settings UI with local-only, hosted-per-session, and hosted-default choices in `apps/desktop/src/features/settings/PrivacySettingsView.tsx`
- [X] T090 Implement private overlay window controls, always-on-top behavior, hotkey hide/show, and capture status reporting in `apps/desktop/src-tauri/src/stealth/window.rs`
- [X] T091 Build stealth overlay controls and status display in `apps/desktop/src/features/settings/StealthSettingsView.tsx`
- [X] T092 Wire provider, privacy, and stealth settings into navigation in `apps/desktop/src/app/App.tsx`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify quality gates, performance budgets, packaging, documentation, and open-source readiness.

- [X] T093 [P] Add Windows packaging smoke test definition in `tests/packaging/windows-installer-smoke.md`
- [X] T094 [P] Add macOS packaging smoke test definition in `tests/packaging/macos-dmg-smoke.md`
- [X] T095 Configure Tauri bundle metadata for Windows installer and macOS app bundle in `apps/desktop/src-tauri/tauri.conf.json`
- [X] T096 Add build and release commands for desktop artifacts in `apps/desktop/package.json`
- [X] T097 [P] Document privacy, local storage, hosted provider behavior, and deletion guarantees in `docs/privacy.md`
- [X] T098 [P] Document provider setup for Ollama, OpenAI-compatible endpoints, OpenAI, Claude, Groq, and NVIDIA in `docs/provider-setup.md`
- [X] T099 [P] Document from-source build and packaging workflow in `docs/building-from-source.md`
- [X] T100 Add performance instrumentation for transcript latency, guidance latency, local search, and UI responsiveness in `apps/desktop/src-tauri/src/logging/performance.rs`
- [X] T101 Add quickstart validation checklist results template in `tests/integration/quickstart_validation.md`
- [X] T102 Run Rust formatting, linting, and tests and record results in `specs/001-treplica-product-spec/verification.md`
- [X] T103 Run frontend formatting, linting, unit/component tests, and desktop smoke tests and record results in `specs/001-treplica-product-spec/verification.md`
- [X] T104 Run quickstart privacy, stealth, deletion, and packaging validation and record results in `specs/001-treplica-product-spec/verification.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2. MVP scope.
- **Phase 4 US2**: Depends on Phase 2 and uses the live session surface from US1 when integrated, but translation service and tests remain independently verifiable with fixtures.
- **Phase 5 US3**: Depends on Phase 2 and extends US1 guidance behavior.
- **Phase 6 US4**: Depends on Phase 2 and uses data produced by US1-US3; can be fixture-tested independently.
- **Phase 7 Provider/Privacy/Stealth**: Depends on Phase 2 and should be completed before release validation.
- **Phase 8 Polish**: Depends on desired user story phases and Phase 7.

### User Story Dependencies

- **US1 (P1)**: Required MVP; no user-story dependency after foundation.
- **US2 (P2)**: Can be implemented after foundation with transcript fixtures; best integrated after US1 UI exists.
- **US3 (P3)**: Can be implemented after foundation with transcript/context fixtures; best integrated after US1 guidance exists.
- **US4 (P4)**: Can be implemented after foundation using seeded sessions; full end-to-end value improves after US1-US3.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Implement backend/store/provider behavior before UI wiring.
- Add UI components before route integration.
- Complete audit logging and privacy checks before marking a story done.
- Validate the independent test before moving to the next priority.

## Parallel Opportunities

- Setup tasks T004-T008 and T010-T015 can run in parallel after T001-T003 are clear.
- Foundational tasks T018, T021-T024, T026-T034 can be split across store, provider, logging, command, frontend, and fixture ownership.
- US1 tests T035-T038 can run in parallel; implementation tasks T039-T041 and T044-T046 can run in parallel before integration tasks T042-T043 and T047-T049.
- US2 tests T050-T052 and implementation tasks T053, T055-T057 can run in parallel before T054 and T058-T059.
- US3 tests T060-T062 and implementation tasks T063, T065-T067 can run in parallel before T064 and T068-T069.
- US4 tests T070-T073 and implementation tasks T074-T077 and T079-T081 can run in parallel before T078 and T082-T083.
- Phase 8 documentation and packaging smoke definitions T093-T099 can run in parallel with performance instrumentation T100.

## Parallel Example: User Story 1

```bash
# Independent test work:
Task: "T035 [US1] Add Rust integration test for session lifecycle in tests/integration/live_session_lifecycle.rs"
Task: "T036 [US1] Add provider contract test for guidance in tests/contract/guidance_contract.rs"
Task: "T037 [US1] Add frontend component test in apps/desktop/tests/component/live-session.test.tsx"
Task: "T038 [US1] Add desktop smoke test in apps/desktop/tests/e2e/live-guidance.spec.ts"

# Independent implementation work:
Task: "T039 [US1] Implement session state service in apps/desktop/src-tauri/src/sessions/service.rs"
Task: "T040 [US1] Implement audio capture abstraction in crates/audio-core/src/lib.rs"
Task: "T045 [US1] Build transcript stream UI in apps/desktop/src/features/live-session/TranscriptStream.tsx"
Task: "T046 [US1] Build guidance panel UI in apps/desktop/src/features/live-session/GuidancePanel.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T074 [US4] Implement generated document service in apps/desktop/src-tauri/src/documents/service.rs"
Task: "T076 [US4] Implement history query repository in crates/local-store/src/history_repository.rs"
Task: "T079 [US4] Build session history list UI in apps/desktop/src/features/history/SessionHistoryView.tsx"
Task: "T081 [US4] Build generated documents panel in apps/desktop/src/features/documents/DocumentsPanel.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 US1.
4. Validate live session lifecycle, simulated transcript ingestion, guidance generation, suggestion copy/save, audit events, and UI states.
5. Stop for demo before adding translation, objection specialization, history, documents, provider UI, stealth, and packaging polish.

### Incremental Delivery

1. Foundation: Tauri app, local store, provider abstraction, audit logs, command boundary.
2. US1: Live guidance MVP.
3. US2: Live translation.
4. US3: Objection/follow-up intelligence.
5. US4: History, summaries, generated documents, export, deletion.
6. Provider/privacy/stealth surfaces.
7. Packaging and release hardening.

### Parallel Team Strategy

1. Team completes Phase 1 and Phase 2 together.
2. After foundation:
   - Developer A: US1 live guidance backend and UI.
   - Developer B: US2 translation and language UI.
   - Developer C: US3 guidance categories and context editor.
   - Developer D: US4 history, documents, deletion, and exports.
   - Developer E: Provider settings, privacy, stealth, packaging, and documentation.
3. Integrate by passing contract tests and quickstart validation after each story.

## Notes

- Tests are required by constitution and should be written before implementation for each story.
- All provider work must preserve local-only mode and never log credentials.
- Stealth overlay behavior must be labeled as supported, unsupported, or unknown instead of promising universal invisibility.
- No task may introduce artificial limits on meetings, session length, provider choice, stealth mode, local history, or generated documents.
