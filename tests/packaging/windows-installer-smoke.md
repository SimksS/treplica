# Windows Installer Smoke Test

**Artifact**: MSI produced by `npm run tauri:build` (or `npm run release:windows`)  
**Environment**: Clean Windows 10/11 user profile or VM snapshot

## Preconditions

- [ ] Rust + Node build succeeded on `x86_64-pc-windows-msvc`
- [ ] Installer path recorded: `apps/desktop/src-tauri/target/release/bundle/msi/*.msi`

## Install

1. [ ] Double-click MSI (or `msiexec /i Treplica_*.msi`)
2. [ ] Complete wizard without errors
3. [ ] Shortcut appears in Start Menu
4. [ ] App launches from shortcut

## First launch

1. [ ] Main window opens (`Treplica` title)
2. [ ] No account / subscription gate
3. [ ] App data dir created: `%APPDATA%\com.treplica.desktop\` (or equivalent) with `treplica.db`
4. [ ] Default Ollama provider seeded in **Configurações → Providers**

## Core smoke (5 min)

1. [ ] **Ao vivo** — create session, start, simulate transcript tick
2. [ ] Guidance request returns suggestions
3. [ ] **Histórico** — ended session visible after end
4. [ ] **Configurações → Privacidade** — local-only blocks hosted (if hosted configured)
5. [ ] **Stealth** — `Ctrl+Shift+H` toggles overlay window

## Uninstall

1. [ ] Uninstall from Settings → Apps
2. [ ] No unexpected network upload during uninstall (monitor if needed)
3. [ ] User data folder behavior documented (retained vs removed per installer policy)

## Result

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Build version | |
| PASS / FAIL | |
| Notes | |
