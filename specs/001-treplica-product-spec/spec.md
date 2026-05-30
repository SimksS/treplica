# Feature Specification: Treplica Real-Time Meeting Assistant

**Feature Branch**: `001-treplica-product-spec`

**Created**: 2026-05-22

**Status**: Active (MVP + extensões pós-MVP documentadas em [ecosystem.md](./ecosystem.md))

**Input**: Open-source desktop assistant for live meeting guidance, translation, and local session history.

**Product name**: Treplica — assistente local para conversas de alto impacto (vendas, entrevistas, liderança, apresentações).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive real-time guidance during a meeting (Priority: P1)

A professional joins a high-stakes call and needs immediate help responding to difficult questions, objections, or unexpected comments while the conversation is happening.

**Why this priority**: The core promise of Treplica is to listen in real time and provide useful, personalized guidance during live conversations.

**Independent Test**: Start a simulated meeting, provide spoken prompts from another participant, and verify that the user receives relevant response suggestions quickly enough to use them in the same conversation.

**Acceptance Scenarios**:

1. **Given** a user is in an active listening session, **When** another speaker asks a technical, sales, or presentation-related question, **Then** the assistant presents a concise suggested answer that matches the conversation context.
2. **Given** a user has provided personal prompts or context for the meeting, **When** the assistant generates guidance, **Then** suggestions reflect that context instead of generic advice.
3. **Given** the assistant cannot confidently infer a useful response, **When** guidance is requested, **Then** it provides a safe fallback such as clarifying questions, talking points, or a short acknowledgement rather than fabricating specifics.

---

### User Story 2 - Translate live conversations (Priority: P2)

A user participates in a conversation where one or more people speak a language the user does not fully understand and needs live transcription plus translation into their preferred language.

**Why this priority**: The referenced product highlights live translation as a major capability for meetings, calls, and presentations.

**Independent Test**: Run a simulated conversation with at least two languages and verify that the user can read translated speech while the conversation continues.

**Acceptance Scenarios**:

1. **Given** a session is listening to a speaker in another language, **When** speech is detected, **Then** the user sees both the original transcript and translated meaning in the selected language.
2. **Given** the user changes the preferred translation language before a session, **When** the next session starts, **Then** translations appear in that selected language.
3. **Given** speech is unclear or interrupted, **When** the assistant cannot produce a reliable translation, **Then** it marks the affected segment as uncertain and avoids presenting it as confirmed.

---

### User Story 3 - Handle objections and follow-up moments (Priority: P3)

A salesperson, founder, executive, interviewer, or presenter needs persuasive follow-ups, objection handling, and next-step suggestions that keep the conversation moving.

**Why this priority**: The product positions itself for people who sell, lead, interview, and present, with emphasis on objection handling and improved performance.

**Independent Test**: Provide sample objections or challenging responses and verify that the assistant returns actionable replies, follow-up questions, or next-step prompts tailored to the scenario.

**Acceptance Scenarios**:

1. **Given** a prospect raises an objection, **When** the assistant analyzes the conversation, **Then** it suggests a response that addresses the objection and proposes a next step.
2. **Given** an interviewer receives an unexpected answer, **When** guidance is generated, **Then** the assistant suggests relevant follow-up questions.
3. **Given** a presenter is delivering a pitch, **When** audience concerns appear in the transcript, **Then** the assistant suggests concise supporting arguments or facts.

---

### User Story 4 - Review session outcomes after a conversation (Priority: P4)

After a meeting, the user wants to review what happened, capture useful takeaways, and improve future performance.

**Why this priority**: Treplica promotes summaries, productivity, follow-ups, and continuous improvement as supporting value after the live conversation.

**Independent Test**: Complete a simulated session and verify that the user receives a session summary, key moments, suggested follow-ups, and improvement notes.

**Acceptance Scenarios**:

1. **Given** a session has ended, **When** the user opens the session review, **Then** they see a summary of key points, decisions, objections, and suggested next actions.
2. **Given** the user wants to reuse a strong answer, **When** they review generated suggestions, **Then** they can identify which suggestions were shown during the session and copy or save useful ones.
3. **Given** multiple sessions exist, **When** the user reviews history, **Then** sessions are distinguishable by date, title, context, language, and assistant preset.

---

### User Story 5 - Configure assistant and briefing before a meeting (Priority: P1)

A user wants to choose the type of assistant (note-taker, sales, interview, general) and optionally upload meeting briefing material before listening starts.

**Why this priority**: Guidance quality depends on scenario and context; users need a deliberate setup step without blocking quick starts.

**Independent Test**: Open start-meeting modal, select sales preset, attach a PDF briefing, start session, and verify context appears in history and influences guidance prompts.

**Acceptance Scenarios**:

1. **Given** the user clicks **Analisar conversa**, **When** the start modal opens, **Then** they can select an assistant preset and optionally add pre-meeting context.
2. **Given** pre-meeting context is omitted, **When** the session starts, **Then** guidance uses transcript and preset defaults only.
3. **Given** the user imports a `.md`, `.txt`, or `.pdf` briefing, **When** the session starts, **Then** extracted text is stored and shown in session history.

---

### User Story 6 - Leave or end an active session safely (Priority: P2)

A user navigating away, closing the app, or hiding the stealth overlay while a session is active must not lose work unintentionally.

**Why this priority**: Active sessions span main window and stealth overlay; accidental exit causes confusion.

**Independent Test**: Start session, attempt navigation/close, confirm modal with end / keep active / cancel.

**Acceptance Scenarios**:

1. **Given** a listening session, **When** the user navigates to home or history, **Then** a confirmation dialog appears.
2. **Given** the user chooses **Manter ativa**, **When** they return, **Then** the session continues.
3. **Given** the user chooses **Encerrar**, **When** confirmed, **Then** session status becomes `ended`.

---

### User Story 7 - Browse and filter session history (Priority: P2)

A user reviews past meetings, filters by assistant type, renames sessions, and inspects full detail including context and documents.

**Why this priority**: Local history is a core differentiator; post-MVP features need discoverability.

**Independent Test**: Create sessions with different presets, filter history, open detail tabs including Context.

**Acceptance Scenarios**:

1. **Given** sessions with different `assistant_preset_id`, **When** the user filters by assistant, **Then** only matching sessions appear.
2. **Given** a session detail view, **When** the user opens the Context tab, **Then** they see preset, configuration, and pre-meeting briefing if any.
3. **Given** a session title, **When** the user renames it, **Then** the new title persists in history.

---

### User Story 8 - Control where documents are saved and re-import them (Priority: P3)

A user chooses a folder for exported Markdown documents and can import them after reinstall or on another machine.

**Why this priority**: Users must own their artifacts outside the app data directory.

**Independent Test**: Set custom export folder, generate document, import folder on clean DB, verify document in history.

**Acceptance Scenarios**:

1. **Given** settings → Arquivos e backup, **When** the user picks a folder, **Then** new exports write there.
2. **Given** exported `.md` files with Treplica front matter, **When** the user imports a folder, **Then** documents appear linked to sessions (creating placeholder sessions if needed).
3. **Given** duplicate import, **When** the same file path exists, **Then** it is skipped.

---

### User Story 9 - Complete onboarding and route models by task (Priority: P3)

A first-time user completes setup (permissions, language, provider test) and optionally assigns different providers/models per AI task.

**Independent Test**: Fresh profile runs wizard; model routing saves per task.

**Acceptance Scenarios**:

1. **Given** first launch, **When** onboarding is incomplete, **Then** setup wizard blocks main app until finished or skipped steps resolved.
2. **Given** model routing settings, **When** user assigns Ollama to guidance and hosted to summarization, **Then** each task uses the configured provider.

---

### User Story 10 - Analyze screen content during a session (Priority: P4)

A user captures or uploads a screenshot for contextual guidance (slides, code, shared screen).

**Independent Test**: Capture snapshot in live or stealth view, receive vision-based suggestion.

**Acceptance Scenarios**:

1. **Given** an active session, **When** the user captures the screen, **Then** vision provider analyzes image with session context.
2. **Given** privacy mode local-only, **When** vision requires hosted provider, **Then** request is blocked or user is warned per privacy rules.

### Edge Cases

- The assistant detects silence, background noise, overlapping speakers, or poor audio quality.
- Multiple speakers switch languages during the same session.
- The user loses network connectivity or the meeting platform audio becomes unavailable.
- The assistant receives sensitive, private, or regulated information during a meeting.
- A suggestion is low confidence, potentially inappropriate, or inconsistent with the user's saved context.
- The user shares their screen and expects the assistant controls and suggestions to remain outside the shared audience view where platform rules allow.
- The user starts a session without setting context, role, or meeting objective.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to start, pause, resume, and end a live assistance session.
- **FR-002**: The system MUST capture live spoken conversation with clear user awareness and permission before listening begins.
- **FR-003**: The system MUST display real-time transcript segments for the active session.
- **FR-004**: The system MUST generate concise guidance based on the current conversation, including suggested answers, talking points, clarifying questions, or next-step prompts.
- **FR-005**: The system MUST allow users to provide session context such as role, objective, audience, product, company, or custom prompts before or during a session.
- **FR-006**: The system MUST use the user's provided context when generating suggestions.
- **FR-007**: The system MUST support live translation from detected speech into the user's selected language.
- **FR-008**: The system MUST show uncertainty when transcription, translation, or guidance confidence is low.
- **FR-009**: The system MUST support common meeting and call scenarios, including interviews, sales calls, executive meetings, investor pitches, presentations, and multilingual calls.
- **FR-010**: The system MUST provide objection-handling suggestions that include a recommended reply and, when useful, a follow-up question or proposed next step.
- **FR-011**: The system MUST keep assistant controls and guidance usable while the user is participating in another meeting or presentation surface.
- **FR-012**: The system MUST provide a session summary after a session ends, including key points, questions, objections, decisions, and follow-up suggestions.
- **FR-013**: The system MUST allow users to review prior sessions and distinguish them by date, title, language, and meeting context.
- **FR-014**: The system MUST allow users to delete session history and associated transcript, translation, summary, and suggestion data.
- **FR-015**: The system MUST provide clear privacy notices for listening, transcription, translation, generated guidance, session storage, and deletion.
- **FR-016**: The system MUST prevent generated suggestions from being presented as verified facts when the underlying context does not support them.
- **FR-017**: The system MUST present loading, listening, paused, reconnecting, error, and ended states in a way users can understand quickly.
- **FR-018**: The system MUST make the primary live assistance flow usable without requiring the user to read instructions during a meeting.
- **FR-019**: The system MUST be installable as a desktop application for Windows and macOS.
- **FR-020**: The system MUST be distributed as open source and MUST NOT include artificial product limits on meeting count, stealth mode, session length, provider choice, or local history.
- **FR-021**: The system MUST allow users to choose and configure AI providers, including local providers and hosted providers, without changing the app code.
- **FR-022**: The system MUST keep session data, transcripts, generated documents, configuration, logs, and provider credentials on the user's machine unless the user explicitly chooses a hosted AI provider for a request.
- **FR-023**: The system MUST record a local audit log of meaningful user and assistant actions, including session lifecycle events, generated artifacts, provider calls, errors, deletion events, and settings changes.
- **FR-024**: The system MUST offer named assistant presets (e.g. note-taker, sales, interview, general) selectable before starting a session via the analyze-conversation flow.
- **FR-025**: The system MUST allow optional pre-meeting context (text, Markdown, plain text, PDF) before a session starts and MUST persist it per session.
- **FR-026**: The system MUST inject pre-meeting context into guidance and vision prompts when present.
- **FR-027**: The system MUST persist global assistant preferences in local app settings and apply them to new sessions unless overridden at start.
- **FR-028**: The system MUST prompt the user before ending an active session when navigating away, closing the main window, or hiding the stealth overlay.
- **FR-029**: The system MUST allow filtering session history by assistant preset.
- **FR-030**: The system MUST show session detail tabs including transcript, context, guidance, translations, audit, and documents.
- **FR-031**: The system MUST allow the user to configure a custom directory for exported generated documents.
- **FR-032**: The system MUST allow importing previously exported Treplica Markdown documents from a user-selected folder.
- **FR-033**: The system MUST run a first-run onboarding wizard for permissions, transcription language, and provider smoke test.
- **FR-034**: The system MUST allow routing different AI tasks (transcription, guidance, translation, vision, summarization) to different providers/models.
- **FR-035**: The system MUST support screen snapshot / image analysis during an active session using the vision task routing.
- **FR-036**: The system MUST expose a stealth overlay that mirrors live session capabilities with global hotkeys.
- **FR-037**: The system MUST parse PDF briefing files locally for pre-meeting context without uploading the file unless the user uses a hosted parse path (not applicable — parsing is local).

### Key Entities *(include if feature involves data)*

- **User**: A person using the assistant during meetings, calls, interviews, or presentations.
- **Session**: A live or completed conversation assistance event with status, timing, context, language preferences, and history.
- **Transcript Segment**: A portion of detected speech with speaker attribution when available, timestamp, original language, text, and confidence.
- **Translation Segment**: A translated version of a transcript segment with target language, translated text, and confidence.
- **Guidance Suggestion**: A real-time answer, talking point, objection response, follow-up question, or next-step recommendation generated for the user.
- **Session Context**: User-provided background such as meeting goal, role, audience, product details, company details, custom prompts, preferred tone, forbidden topics, **assistant preset id**, **system prompt**, and **pre-meeting briefing** (text + optional source filename).
- **App Settings**: Local JSON file for onboarding flags, hotkeys, model routing, global assistant defaults, and **custom documents export directory**.
- **Session Summary**: Post-session overview containing highlights, decisions, objections, action items, and improvement notes.
- **AI Provider Configuration**: User-controlled settings for local or hosted AI providers, model selection, credentials, privacy mode, and provider-specific limits.
- **Audit Log Entry**: Local record of a meaningful action, provider interaction, generated artifact, error, or data deletion event.
- **Generated Document**: A local artifact derived from a session, such as a summary, follow-up draft, objection analysis, meeting notes, or exported transcript.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated usability tests, 85% of users can start a live assistance session and understand that listening is active within 30 seconds.
- **SC-002**: During simulated conversations, 90% of guidance suggestions appear soon enough for users to apply them before the conversation moves to a new topic.
- **SC-003**: In evaluation sessions, 80% of generated suggestions are rated relevant and useful by target users for the meeting scenario.
- **SC-004**: For supported language pairs in test conversations, 85% of translated segments preserve the intended meaning well enough for users to follow the discussion.
- **SC-005**: 90% of users can identify and use session controls, language selection, and context settings without external instructions.
- **SC-006**: 95% of completed sessions produce a reviewable summary containing key points, objections or questions, and at least one useful follow-up item when conversation content supports it.
- **SC-007**: Users can delete a saved session and its related generated artifacts in under 30 seconds.
- **SC-008**: In screen-sharing usability checks, users can keep assistance visible to themselves while avoiding accidental display to the shared audience in supported sharing modes.
- **SC-009**: Users can install and launch the application on supported Windows and macOS machines without creating an account.
- **SC-010**: Users can configure at least one local provider and one hosted provider path in under 5 minutes when they already have the required provider credentials or local model runtime.
- **SC-011**: In privacy validation, session history, transcripts, logs, generated documents, and credentials remain stored locally, with no remote transfer except explicit user-initiated provider requests.

## Assumptions

- The first version focuses on individual users who need assistance during live professional conversations.
- The default product language for this specification is Portuguese, while live translation supports user-selected target languages.
- Meeting platform compatibility means the assistant supports common workflows around Zoom, Google Meet, Microsoft Teams, Hangouts, and similar tools, without requiring the meeting audience to install anything.
- Users are responsible for following applicable consent, recording, workplace, and platform rules; the product must make listening and data handling clear enough for informed use.
- The initial scope includes live assistance, translation, session review, and history management; billing, account administration, team management, and public marketing pages are outside this feature.
- The product should prioritize fast, concise guidance over long-form coaching during live sessions.
- The app is intended to be open source from the beginning, so provider integrations, local storage format, logging behavior, and build scripts should be inspectable and modifiable by users.
- "Stealth mode" means a private assistant overlay that stays out of supported screen-sharing captures where the operating system and meeting platform allow it; it must still respect consent, platform rules, and local laws.
