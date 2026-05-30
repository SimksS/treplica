# Quickstart Validation Results

Template for manual validation per [specs/001-treplica-product-spec/quickstart.md](../../specs/001-treplica-product-spec/quickstart.md).

## Run metadata

| Field | Value |
|-------|-------|
| Date | |
| Tester | |
| OS | |
| App version | |
| Build type | dev / release installer |

## Primary flow

| Step | PASS / FAIL | Notes |
|------|-------------|-------|
| Launch without account | | |
| Create session + context | | |
| Start listening | | |
| Simulated transcript appears | | |
| Translation enabled | | |
| Objection guidance | | |
| Copy/save suggestion | | |
| End session | | |
| Generate summary + follow-up doc | | |
| History shows full detail | | |
| Export document | | |
| Delete session + data removed | | |

## Privacy

| Step | PASS / FAIL | Notes |
|------|-------------|-------|
| local_only blocks hosted | | |
| hosted_per_session asks approval | | |
| Audit log has no credentials | | |

## Stealth

| Step | PASS / FAIL | Notes |
|------|-------------|-------|
| Overlay always-on-top | | |
| Hotkey hide/show | | |
| Capture status labeled (not “invisible everywhere”) | | |

## Packaging (optional)

| Platform | PASS / FAIL | Artifact path |
|----------|-------------|---------------|
| Windows MSI | | |
| macOS DMG | | |

## Performance audit sample

After a live session, open session detail audit events and confirm `performance` category entries exist:

| Metric | Budget (ms) | Observed (ms) | Within budget |
|--------|---------------|---------------|---------------|
| transcript_update | 1000 | | |
| guidance | 3000 | | |
| ui_state_build | 100 | | |
| local_search | 1000 | | |

## Automated gates (paste command output summary)

| Command | Result |
|---------|--------|
| `cargo fmt --all -- --check` | |
| `cargo clippy --workspace` | |
| `cargo test --workspace` | |
| `npm run lint` | |
| `npm run test` | |

## Sign-off

- [ ] All required flows PASS
- [ ] No artificial limits observed (meetings, history, providers, stealth)
- [ ] Ready for release candidate: YES / NO
