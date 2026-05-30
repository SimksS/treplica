# Verification — Treplica Desktop Assistant

**Date**: 2026-05-23 (atualizado)  
**Scope**: Phases 1–8 + extensões pós-MVP (US5–US10, ver [ecosystem.md](./ecosystem.md))

## Checklist pre-implement

| Checklist | Total | Completed | Status |
|-----------|-------|-----------|--------|
| requirements.md | 16 | 16 | PASS |

## Rust workspace (T102)

| Command | Result | Notes |
|---------|--------|-------|
| `cargo fmt --all -- --check` | PASS | 2026-05-22 |
| `cargo clippy --workspace -- -D warnings` | PASS | After audio-core/local-store/desktop fixes |
| `cargo test --workspace` | PASS | 24+ tests incl. `performance::budgets_match_plan` |

## Frontend (T103)

| Command | Result |
|---------|--------|
| `npm run lint` (tsc --noEmit) | PASS |
| `npm run test` (Vitest) | PASS — 74+ tests incl. storage, presets, session tabs |
| `npm run test:e2e` (Playwright) | NOT RUN — requires `npm run dev`; specs: `live-guidance`, `provider-privacy`, `stealth-overlay` |

## Quickstart & packaging (T104)

| Area | Automated | Manual |
|------|-----------|--------|
| Primary session flow | Partial (integration tests) | Template: `tests/integration/quickstart_validation.md` |
| Privacy / hosted warning | Component test | E2E spec `provider-privacy.spec.ts` |
| Stealth overlay | — | E2E spec `stealth-overlay.spec.ts`; hotkey in Tauri only |
| Deletion | `local_deletion_contract`, `session_review` | Quickstart step 22 |
| Start meeting + presets | `assistantContextUtils.test`, E2E `live-guidance` | Quickstart steps 3–5 |
| Export/import documents | `data-storage-settings.test` | Quickstart steps 20–21 |
| History context tab | `session-detail-tabs.test` | Quickstart step 18 |
| Windows MSI | — | `tests/packaging/windows-installer-smoke.md` |
| macOS DMG | — | `tests/packaging/macos-dmg-smoke.md` |

## Feature completeness

| Capability | Status |
|------------|--------|
| Live session + guidance | DONE |
| Translation | DONE |
| Objections / follow-ups | DONE |
| History, documents, export, delete | DONE |
| Providers, privacy, stealth | DONE |
| Assistant presets + start meeting modal | DONE |
| Pre-meeting context (PDF/md/txt) | DONE |
| Session leave confirmation | DONE |
| History filter by assistant + Context tab | DONE |
| Custom export dir + document import | DONE |
| Onboarding wizard | DONE |
| Model routing per task | DONE |
| Vision / screen snapshot | DONE |
| Ecosystem documentation | DONE ([ecosystem.md](./ecosystem.md)) |
| Performance audit events | DONE (`logging/performance.rs`) |
| Release build scripts | DONE (`release:build`, `release:windows`, `release:macos`) |
| Open-source docs | DONE (`docs/privacy.md`, `provider-setup.md`, `building-from-source.md`) |

## Performance budgets (plan.md)

Recorded in local audit log (`category: performance`) when operations run:

| Metric | Budget |
|--------|--------|
| transcript_update | 1000 ms |
| guidance | 3000 ms |
| ui_state_build | 100 ms |
| local_search | 1000 ms |

## Build artifacts

```bash
cd apps/desktop
npm run release:check    # fmt + clippy + tests + lint
npm run release:windows  # MSI (on Windows)
npm run release:macos      # DMG (on macOS)
```

Bundle metadata: `apps/desktop/src-tauri/tauri.conf.json` (publisher, descriptions, wix languages, macOS 12+).

## Sign-off

- [x] All automated gates PASS (2026-05-22)
- [ ] Manual quickstart + installer smoke filled in `quickstart_validation.md`
- [ ] Release candidate on clean VM: pending manual packaging smoke
