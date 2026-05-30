# Chaves de assinatura do updater

| Arquivo | Commitado? | Uso |
|---------|------------|-----|
| `treplica-update.pub` | Sim | Verificação de updates no app (`tauri.conf.json` → `plugins.updater.pubkey`) |
| `treplica-update.key` | **Não** (gitignore) | Assinar `latest.json` e artefatos no CI — guardar como secret |

## Regenerar chaves

```bash
cargo run -p gen-updater-keys
```

Copie o conteúdo de `pubkey-for-tauri.conf.txt` para `apps/desktop/src-tauri/tauri.conf.json`.

## Quando o repositório GitHub existir

1. Ajuste `plugins.updater.endpoints` em `tauri.conf.json` para a URL do `latest.json` da release.
2. No CI, use `treplica-update.key` (secret) para assinar os instaladores e o manifesto.

Até lá, **Verificar atualizações** na UI pode falhar com erro de rede/manifesto — isso é esperado.
