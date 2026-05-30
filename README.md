# Treplica

Assistente desktop local para reuniões: transcrição, orientação em tempo real, tradução, visão e histórico na sua máquina. Construído com **Tauri 2**, **Rust**, **React** e **SQLite**.

## Status

Release candidate com extensões pós-MVP: presets de assistente, contexto pré-reunião, confirmação ao sair da sessão, histórico filtrado, export/import de documentos, onboarding, roteamento de modelos e análise de tela.

Ver [specs/001-treplica-product-spec/verification.md](specs/001-treplica-product-spec/verification.md) para validação.

## Início rápido

1. Instale [Rust](https://rustup.rs) e os [pré-requisitos do Tauri](https://v2.tauri.app/start/prerequisites/)
2. `cd apps/desktop && npm install`
3. `npm run tauri:dev`

Somente UI (sem backend Tauri): `npm run dev`.

Build de instalador: `npm run release:build` (ver [docs/building-from-source.md](docs/building-from-source.md)).

## Documentação

### Comece aqui

- **[Ecossistema da aplicação](specs/001-treplica-product-spec/ecosystem.md)** — mapa completo: arquitetura, fluxos, módulos, persistência
- **[Guia do usuário](docs/user-guide.md)** — como usar o produto no dia a dia (inclui tabela de atalhos)
- **Site — [Documentação oficial](site/)** → `/docs#atalhos-de-teclado` para atalhos Windows e macOS
- **[Índice docs/](docs/README.md)**

### Especificação

- [spec.md](specs/001-treplica-product-spec/spec.md) — requisitos e user stories
- [data-model.md](specs/001-treplica-product-spec/data-model.md) — entidades
- [contracts/](specs/001-treplica-product-spec/contracts/) — contratos de UI, dados, contexto, presets

### Operacional

- [Build from source](docs/building-from-source.md)
- [Provider setup](docs/provider-setup.md)
- [Privacidade](docs/privacy.md)
- [Quickstart manual](specs/001-treplica-product-spec/quickstart.md)

## Licença

MIT
