# macOS DMG Smoke Test

**Artifact**: `.dmg` produced by `npm run tauri:build` (or `npm run release:macos`)  
**Environment**: Clean macOS 12+ user account or VM snapshot

## Preconditions

- [ ] Rust + Node build succeeded on `aarch64-apple-darwin` or `x86_64-apple-darwin`
- [ ] DMG path recorded: `apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg`

## Install

1. [ ] Mount DMG and drag **Treplica** to Applications
2. [ ] First open: Gatekeeper allows app (signed/notarized if release build)
3. [ ] App launches from Applications

## First launch

1. [ ] Main window opens
2. [ ] No account / subscription gate
3. [ ] App data under `~/Library/Application Support/com.treplica.desktop/` with `treplica.db`
4. [ ] Default Ollama provider visible in settings

## Core smoke (5 min)

1. [ ] Live session + simulated transcript + guidance
2. [ ] History lists ended session
3. [ ] Privacy hosted warning before enabling cloud mode
4. [ ] Stealth overlay hotkey toggles visibility

## Capture / overlay note

- [ ] Stealth status reports **active**, **unsupported**, or **unknown** — never promises universal invisibility

## Uninstall

1. [ ] Move app to Trash
2. [ ] Confirm local DB/export files behavior matches docs (user may delete Application Support manually)

## Result

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Build version | |
| PASS / FAIL | |
| Notes | |
