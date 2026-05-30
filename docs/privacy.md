# Privacidade — Treplica

Treplica é **local-first**: por padrão, dados de reunião permanecem no seu dispositivo. Chamadas a LLM/STT na nuvem saem **diretamente do app Rust** para o endpoint que você configurou (sem proxy Treplica).

## O que fica na máquina

- Transcrições, traduções e sugestões de orientação
- Histórico de sessões e documentos gerados
- Metadados de configuração de providers (referências `credential_ref`, não a chave)
- Logs de auditoria de ações do app
- Chaves de API em vault cifrado no disco (`credential-vault/*.key`, prefixo `TREV1:`) com chave mestra no keyring do SO

## Modos de privacidade

| Modo | Comportamento |
|------|----------------|
| `local_only` | Bloqueia qualquer request para providers na nuvem no backend |
| `hosted_per_session` | Exige confirmação por sessão antes de enviar dados hosted (`acknowledge_session_hosted_data`) |
| `hosted_default` | Permite providers hosted configurados, com auditoria |

Antes de ativar modos hosted pela primeira vez, o app exige aceitar o aviso em **Configurações → Privacidade**.

## Providers hosted

Quando um provider hosted está habilitado e o modo de privacidade permite:

- Trechos de transcrição, áudio, imagens ou contexto necessários podem ser enviados ao `base_url` configurado
- URLs de providers passam por allowlist (hosts conhecidos ou opção explícita de endpoint customizado)
- O cliente HTTP não segue redirects automáticos (mitigação SSRF)
- Cada chamada gera registro em `provider_calls` e evento de auditoria **sem credenciais**
- Erros de API retornam mensagens genéricas ao frontend (sem corpo HTTP bruto)

## Captura de áudio em reuniões

| Fonte | O que é enviado à nuvem (STT) | Permissões |
|--------|-------------------------------|------------|
| Microfone | Trechos de fala após pausa (VAD), como áudio codificado para Whisper | Microfone (macOS/Windows) |
| Áudio do sistema | Mesmo pipeline STT; rótulo **Sistema** na transcrição | Windows: loopback WASAPI; macOS 14.6+: **Gravação de áudio do sistema** |

O áudio do PC é capturado **localmente** no processo Rust (`cpal` loopback). Só trechos segmentados são enviados ao provider STT que você configurou — não há upload contínuo do stream bruto.

Em plataformas sem loopback nativo (Linux, macOS anterior a 14.6), o fallback usa compartilhamento de tela com áudio no WebView; nesse modo o SO pode ver o diálogo de captura de tela.

## Modo stealth

O overlay stealth é uma janela sempre no topo com atalho global (`Ctrl+Shift+H` por padrão).

- No **Windows 10 (2004+)** e **macOS**, o app usa a API do sistema para que o overlay **não apareça** em capturas de tela comuns — você ainda o vê no monitor físico.
- A janela stealth usa capabilities Tauri reduzidas (sem comandos de exclusão/importação de dados)

## Exclusão e retenção

- **Excluir sessão**: remove registros no SQLite, documentos gerados e arquivos exportados gerenciados pelo app
- **Excluir documento**: remove apenas o artefato selecionado
- Entrada mínima de auditoria registra a exclusão (sem conteúdo sensível do documento)

## Logs e telemetria

- Não há telemetria de produto embutida nesta versão open-source
- Logs de auditoria passam por scrubbing de campos sensíveis (`api_key`, `token`, `bearer`, `x-api-key`, etc.)
- Métricas de performance registram duração vs orçamento local — não saem do dispositivo

## Atualizações do app

Em **Configurações → Atualizações**, você pode verificar releases assinadas no GitHub. A instalação **nunca** ocorre sem confirmação explícita.

## Onde os dados ficam no disco

| SO | Caminho típico |
|----|----------------|
| Windows | `%APPDATA%\com.treplica.desktop\` |
| macOS | `~/Library/Application Support/com.treplica.desktop/` |

Arquivos: `treplica.db`, `app_settings.json`, `credential-vault/`, exports em subpastas do diretório de dados.

### Pasta de exportação de documentos

Por padrão, documentos gerados (`.md`) ficam em `{app_data}/exports/{session_id}/`.

Em **Configurações → Arquivos e backup** você pode escolher pasta personalizada, importar (somente dentro da pasta de exportação) e abrir no gerenciador de arquivos.
