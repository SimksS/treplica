# Treplica Constitution

## Core Principles

### I. Code Quality Is a Product Requirement
All production code MUST be clear, cohesive, and maintainable. Features must follow the existing project architecture, naming conventions, dependency patterns, and formatting rules before introducing new abstractions. Code duplication is allowed only when it preserves clarity for small, local cases; shared abstractions must prove they reduce complexity across real call sites. Error handling must be explicit, typed or structured where the stack supports it, and user-impacting failures must be observable through logs or surfaced states. Dead code, placeholder behavior, hidden TODO-driven logic, and unexplained complexity are not acceptable in completed work.

### II. Tests Define the Contract
Every feature MUST include tests that prove its critical behavior before it is considered complete. Unit tests cover deterministic logic and edge cases; integration or end-to-end tests cover user journeys, data boundaries, API contracts, and cross-component behavior. Bug fixes MUST include a regression test that fails before the fix or a documented reason why the failure cannot be automated. Tests must be reliable, isolated, and meaningful; snapshots and broad mocks may support coverage but cannot replace assertions about user-visible behavior or business rules.

### III. User Experience Must Stay Consistent
User-facing work MUST preserve visual, interaction, accessibility, and content consistency across the product. New UI must reuse the established design system, component patterns, spacing, typography, responsive behavior, and language tone unless a deliberate product decision justifies a change. All interactive states must be designed and implemented: loading, empty, error, disabled, success, validation, and permission-denied states where applicable. Keyboard access, semantic structure, focus management, contrast, and screen-reader labels are required for interactive flows.

### IV. Performance Has Explicit Budgets
Every plan MUST define performance expectations appropriate to the feature, and implementation MUST protect them. Client-facing interactions should avoid unnecessary blocking work, layout shifts, redundant network calls, oversized assets, and avoidable re-renders. Server or data work must avoid unbounded queries, N+1 access patterns, unnecessary serialization, and hidden synchronous bottlenecks. Any feature that adds measurable latency, bundle size, memory use, or background work MUST document the tradeoff and include verification.

### V. Simplicity, Traceability, and Incremental Delivery
Features MUST be delivered as small, independently reviewable slices tied to user stories and acceptance criteria. Each change must be traceable from specification to plan, tasks, implementation, and verification. Prefer straightforward implementation over speculative extensibility; introduce new frameworks, services, global state, or cross-cutting patterns only when the plan documents the need and rejected simpler alternatives. Each slice must leave the product in a working state with no knowingly broken adjacent flows.

## Quality Standards

- Formatting, linting, type checking, and static analysis configured for the project MUST pass before completion.
- Public interfaces, shared modules, and non-obvious business rules MUST have concise documentation or self-explanatory tests.
- Data validation MUST happen at trust boundaries: user input, API payloads, persisted data, environment configuration, and third-party responses.
- Security-sensitive logic MUST fail closed and avoid leaking secrets, tokens, personal data, or implementation details in logs and UI.
- New dependencies MUST be justified by a clear need, active maintenance, compatibility with the current stack, and an acceptable size and security profile.

## Testing Standards

- Each user story MUST define an independent test path in the specification and plan.
- Critical paths MUST have automated verification at the lowest practical level plus at least one higher-level journey or integration check when multiple modules interact.
- Edge cases called out in the specification MUST be represented in tests or explicitly accepted as manual verification with rationale.
- Test data MUST be deterministic and isolated from developer machines, production services, and execution order.
- A feature is not complete until the relevant automated test suite and any documented manual checks have been run, with results recorded in the plan or final delivery notes.

## User Experience Consistency

- UI changes MUST match existing component behavior, layout density, responsive breakpoints, iconography, and terminology.
- Every primary flow MUST handle loading, empty, error, and success states without visual jumps, overlapping content, or inaccessible controls.
- Forms MUST provide clear validation timing, actionable messages, preserved user input after recoverable errors, and accessible labels.
- Navigation changes MUST preserve user orientation through meaningful page titles, active states, breadcrumbs or equivalent context where appropriate.
- Copy MUST be concise, specific, and consistent with product vocabulary; implementation notes and feature explanations do not belong in the product UI.

## Performance Requirements

- Plans MUST identify target budgets for the affected surface, such as interaction latency, page load, API response time, bundle impact, query volume, or memory use.
- Client changes MUST minimize render work, avoid unnecessary hydration, lazy-load heavy assets where appropriate, and use stable layout dimensions for dynamic content.
- Network usage MUST be intentional: cache safe data, batch or parallelize independent calls, debounce repeated user-triggered requests, and avoid duplicate fetches.
- Backend or data access changes MUST use bounded pagination, indexed access paths where applicable, timeout-aware calls, and resilient error handling.
- Performance-sensitive features MUST include evidence from tests, profiling, build output, logs, or documented manual measurement.

## Governance

This constitution supersedes conflicting local habits, generated task suggestions, and ad hoc implementation preferences. All specifications, plans, tasks, code reviews, and delivery notes MUST verify compliance with the principles above.

Amendments require a documented change to this file, a summary of the reason for the amendment, and review of affected templates or active specs. Versioning follows semantic versioning: MAJOR for principle removals or incompatible governance changes, MINOR for new principles or substantial new requirements, and PATCH for clarifications that preserve intent.

Any approved exception MUST be written in the relevant plan under Complexity Tracking or an equivalent decision record, including the user impact, simpler alternatives considered, and the follow-up needed to remove or revisit the exception.

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
