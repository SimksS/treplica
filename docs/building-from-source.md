# Build from source — Treplica

> Arquitetura e mapa de módulos: [specs/001-treplica-product-spec/ecosystem.md](../specs/001-treplica-product-spec/ecosystem.md)

## Pré-requisitos

- [Rust](https://rustup.rs) stable
- Node.js LTS + npm
- [Pré-requisitos Tauri 2](https://v2.tauri.app/start/prerequisites/) para Windows ou macOS
- Windows 10+ ou macOS 12+ para targets desktop

## Layout do workspace

| Caminho | Conteúdo |
|---------|----------|
| `apps/desktop` | Shell Tauri + UI React |
| `crates/local-store` | SQLite + repositórios |
| `crates/provider-core` | Adapters de IA |
| `crates/audio-core` | Captura/simulação de áudio |
| `tests/` | Contratos, integração, packaging smoke |

## Desenvolvimento

```bash
cd apps/desktop
npm install
npm run tauri:dev
```

Somente frontend (sem comandos Tauri):

```bash
npm run dev
```

## Testes automatizados

Na raiz do repositório:

```bash
cargo test --workspace
```

No app desktop:

```bash
cd apps/desktop
npm run lint
npm run test
npm run test:e2e   # requer `npm run dev` em outro terminal
```

Checagem completa pré-release:

```bash
cd apps/desktop
npm run release:check
```

## Build de release

### Todas as plataformas (host atual)

```bash
cd apps/desktop
npm run release:build
```

Artefatos em `apps/desktop/src-tauri/target/release/bundle/`.

### Windows (MSI)

```bash
npm run release:windows
```

Validação manual: [tests/packaging/windows-installer-smoke.md](../tests/packaging/windows-installer-smoke.md)

### macOS (DMG)

```bash
npm run release:macos
```

Validação manual: [tests/packaging/macos-dmg-smoke.md](../tests/packaging/macos-dmg-smoke.md)

## Metadados do bundle

Configurados em `apps/desktop/src-tauri/tauri.conf.json`:

- Identificador: `com.treplica.desktop`
- Targets: `msi` (Windows), `dmg` (macOS)
- macOS minimum: **14.6** (loopback nativo de áudio do sistema via Core Audio)
- macOS: `Info.plist` + `Entitlements.plist` em `src-tauri/` (microfone e gravação de áudio do sistema)

## Dados locais em dev

O app grava em diretório de dados do SO (`treplica.db`, `app_settings.json`). Para resetar, feche o app e remova a pasta de dados listada em [docs/privacy.md](privacy.md).

## Validação quickstart

Preencha o template [tests/integration/quickstart_validation.md](../tests/integration/quickstart_validation.md) após um passe manual completo.

## Atualizações assinadas (GitHub Releases)

Chaves do projeto (público commitado):

```bash
cargo run -p gen-updater-keys
```

- Público: [`apps/desktop/updater/treplica-update.pub`](../apps/desktop/updater/treplica-update.pub)
- Base64 para `tauri.conf.json`: [`apps/desktop/updater/pubkey-for-tauri.conf.txt`](../apps/desktop/updater/pubkey-for-tauri.conf.txt)
- Secreto: `apps/desktop/updater/treplica-update.key` (gitignored — usar só no CI como secret)

Quando o repositório GitHub existir:

1. Ajuste `plugins.updater.endpoints` em `apps/desktop/src-tauri/tauri.conf.json`
2. No CI, assine `latest.json` e os artefatos MSI/DMG com a chave privada

Até lá, **Configurações → Atualizações** pode falhar ao buscar o manifesto — comportamento esperado.
