# Guia do usuário — Treplica

Este guia descreve os fluxos principais da aplicação. Detalhes técnicos estão em [ecosystem.md](../specs/001-treplica-product-spec/ecosystem.md).

## Primeira execução

1. Ao abrir o Treplica pela primeira vez, o **assistente de configuração** solicita permissões (microfone, tela), idioma de transcrição e um teste rápido de provider de IA.
2. Configure pelo menos um provider em **Configurações → Provedores de IA** (ver [provider-setup.md](./provider-setup.md)).
3. Opcional: em **Modelos por função**, atribua providers diferentes para orientação, tradução, visão e resumos.

## Iniciar uma reunião

### Analisar conversa (fluxo recomendado)

1. Na **página inicial**, clique em **Analisar conversa**.
2. No modal **Iniciar reunião** (fluxo em etapas, sem scroll):
   1. **Áudio e idioma** — transcrição ou tradução.
   2. **Microfone (opcional)** — teste de permissão e nível; pule se só for transcrever áudio do PC ou vídeo.
   3. **Áudio do sistema** — confirma captura do som do PC.
   4. **Captura de tela** — monitor e snapshot de teste.
   5. **Assistente** — tipo de IA (anotador, vendas, etc.).
   6. **Contexto (opcional)** — anexe PDF ou imagem (a IA vê as páginas ao pedir orientação) e/ou cole notas em texto.
   - Leia o aviso: o contexto melhora as orientações, mas não é obrigatório.
3. Clique em **Iniciar sessão** — o overlay stealth abre (ou a tela ao vivo, se o overlay falhar).

As preferências de áudio/idioma definidas no modal valem para toda a sessão. Para alterá-las, encerre a sessão e inicie outra reunião pelo modal.

### Outros atalhos na home

**Capturar tela** e **Perguntar algo** iniciam a sessão diretamente, usando as preferências globais do assistente (sem o modal).

### Configurar assistente globalmente

- **Trocar assistente** no card lateral ou durante a sessão ao vivo.
- Alterações sem sessão ativa são salvas em preferências globais e aplicadas na próxima reunião.

## Durante a sessão

### Janela ao vivo ou overlay stealth

Durante a sessão, o overlay e a tela ao vivo mostram um resumo do modo de áudio escolhido no modal (sem editar idioma ou modo no meio da gravação).

- **Áudio do sistema**: capturado automaticamente ao iniciar a escuta (sem compartilhar tela no **Windows** e no **macOS 14.6+**). Trechos aparecem com o rótulo **Sistema**.
- **Microfone**: capturado em paralelo com o áudio do PC. Use **Mutar microfone** para silenciar só a sua voz sem parar a transcrição do sistema.
- **Transcrição**: requer provedor STT na nuvem (Groq/OpenAI com Whisper). No **Windows**, sem provedor configurado, o microfone cai para o Web Speech do navegador (WebView2/Chromium). No **macOS** esse fallback **não existe** — o WebView do sistema (WKWebView) bloqueia o serviço de voz —, então a transcrição (microfone e áudio do sistema) **exige** um provedor de Cloud STT.
- **Tradução**: painel com idioma alvo selecionado.
- **Orientações**: sugestões em tempo real; indicador quando a IA está processando.
- **Captura de tela**: analisa slide/código compartilhado (requer provider de visão configurado).

### Atalhos de teclado

Referência completa (tabela Windows / macOS): site em **Documentação → Atalhos de teclado** (`/docs#atalhos-de-teclado`).

| Ação | Windows / Linux | macOS | Escopo |
|------|-----------------|-------|--------|
| Mostrar ou ocultar overlay (modo discreto) | `Ctrl+Shift+H` | `⌘⇧H` | Global |
| Pedir orientação da IA | `Ctrl+Shift+O` | `⌘⇧O` | Global |
| Gravar / parar no teste do onboarding | `Ctrl+D` | `⌘D` | Dentro do app |

- **Globais** funcionam com o Treplica em segundo plano.
- O atalho de orientação também é reconhecido na janela principal em foco.
- `Ctrl+E` e `Ctrl+Enter` na home são rótulos de interface ainda não ligados a atalhos globais — use **Analisar conversa** para iniciar.

### Permissões de áudio (macOS)

Na primeira captura de áudio do sistema, o macOS pode pedir autorização em **Ajustes do Sistema → Privacidade e Segurança → Gravação de áudio do sistema**. Sem essa permissão, o medidor de áudio do sistema pode ficar em zero.

O microfone usa a permissão **Microfone** (separada).

> **Transcrição no macOS exige Cloud STT.** O reconhecimento de voz do navegador (Web Speech API) não funciona dentro do app no macOS: o WKWebView expõe a API mas o serviço por trás dela retorna `service-not-allowed` — uma limitação da Apple para WebViews embutidos (só o Safari tem acesso). Portanto, no macOS, configure um provedor de Cloud STT (Groq ou OpenAI com Whisper) em **Configurações → Provedores** para transcrever microfone e áudio do sistema. (No Windows, o Web Speech funciona como fallback do microfone via WebView2/Chromium.)

Em **Linux** ou macOS mais antigo que 14.6, o áudio do PC pode exigir **compartilhar a tela** com “áudio do sistema” marcado no diálogo do navegador.

### Sair sem encerrar por engano

Ao navegar para outra área, fechar o app ou ocultar o overlay com sessão ativa, aparece um diálogo:

- **Encerrar sessão** — finaliza e salva no histórico.
- **Manter ativa em segundo plano** — continua ouvindo.
- **Cancelar** — permanece onde está.

## Depois da reunião

### Histórico

- **Histórico** na barra superior lista sessões passadas.
- **Busca** por título.
- **Filtros**: status (ativa, encerrada, falha) e **tipo de assistente**.
- Renomeie sessões pelo editor de título no detalhe.

### Detalhe da sessão — abas

| Aba | Conteúdo |
|-----|----------|
| Conversa | Transcrição e traduções |
| Contexto | Assistente usado, configuração, briefing pré-reunião |
| Orientações | Sugestões geradas |
| Traduções | Segmentos traduzidos |
| Auditoria | Eventos e chamadas a providers |
| Documentos | Resumos, e-mails, exportações |

### Gerar documentos

Na aba **Documentos**, gere resumo, e-mail de follow-up, exportação de transcrição ou notas. O conteúdo fica no banco local e pode ser exportado como `.md`.

## Arquivos e backup

**Configurações → Arquivos e backup**

### Onde os arquivos são salvos

Por padrão: pasta `exports` dentro dos dados do app (ver [privacy.md](./privacy.md)).

Você pode escolher **outra pasta** (ex.: OneDrive, disco externo). Novos documentos passam a ser gravados lá.

### Reinstalar ou trocar de PC

1. Copie a pasta onde os `.md` foram exportados.
2. Após instalar o Treplica, vá em **Arquivos e backup → Importar documentos**.
3. Selecione a pasta — documentos voltam ao histórico; sessões ausentes são recriadas como importadas.

**Nota**: a importação recupera **documentos**, não transcrições nem orientações. Para backup completo do histórico, preserve também o arquivo `treplica.db` (avançado).

## Privacidade e stealth

- [privacy.md](./privacy.md) — modos local/hosted, exclusão, paths no disco.
- **Modo discreto** (Configurações): controla visibilidade do overlay, proteção em capturas de tela e “sempre no topo”. Não inclui mais configuração de sessão — use o modal **Iniciar reunião** na home para áudio, idiomas e testes de captura.

## Onde obter ajuda técnica

- Build e desenvolvimento: [building-from-source.md](./building-from-source.md)
- Providers: [provider-setup.md](./provider-setup.md)
