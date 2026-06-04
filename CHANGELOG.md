# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não publicado]

> Mudanças em desenvolvimento que ainda não foram lançadas.

---

## [0.1.1-beta.2] — 2026-06-04

Segunda versão beta. Foco na qualidade da orientação ao vivo: respostas mais enxutas, assistente que respeita o preset escolhido e memória de conversa durante a sessão.

### Adicionado

- **Memória de conversa por sessão:** a IA agora mantém o contexto da sessão e as orientações anteriores em memória enquanto a reunião dura, em vez de tratar cada pedido isoladamente. O contexto é fixado na primeira orientação e permanece presente até o fim. Ao encerrar a sessão, a conversa com a IA é descartada e a próxima sessão começa do zero.
- **Versão atual na tela de Atualizações:** a versão instalada do Treplica é exibida diretamente, sem precisar verificar atualizações primeiro.

### Alterado

- **Assistente escolhido agora prevalece:** ao selecionar um preset (Vendas, Entrevista, Anotador, Geral) ou definir um prompt de sistema, ele passa a ser a instrução principal do modelo — antes era rebaixado a "instruções adicionais" e contradito por um formato fixo, fazendo todos os assistentes responderem de forma genérica.
- **Respostas mais enxutas para leitura ao vivo:** a orientação passou a vir telegráfica (em geral ≤ 2 frases curtas), com um limite rígido de comprimento na geração, para ser absorvida de relance durante a conversa.
- **Contexto e assistente sempre aplicados ao iniciar:** quando já havia uma sessão ativa, o contexto/assistente escolhido no modal era descartado; agora é sempre aplicado à sessão.

### Corrigido

- **Atalho de orientação (`Ctrl+Shift+O`) no overlay:** o atalho deixava de funcionar de forma intermitente no overlay porque a assinatura do evento era recriada a cada render; agora permanece estável enquanto a sessão está ativa.
- **Updater e atalho no startup:** corrigido o endpoint do updater e o crash ao registrar um atalho global já registrado por um processo anterior.
- **Testes:** atualização do Vitest para a série 4.x e correção do teste de provider.

### Problemas Conhecidos

- **Contexto pré-reunião (texto):** em alguns fluxos, o texto digitado no campo de contexto pode não estar chegando ao modelo. Correção em andamento — por ora, instruções inseridas ali podem ser ignoradas.
- Os problemas conhecidos da `0.1.0-beta.1` (assinatura no macOS, transparência/exclusão de captura no Linux, desempenho de modelos grandes no Ollama) permanecem válidos.

---

## [0.1.0-beta.1] — 2026-06-01

Primeira versão pública do Treplica. Lançamento beta focado em estabilidade core e experiência local-first.

### Adicionado

#### Transcrição em Tempo Real
- Transcrição ao vivo via microfone com processamento 100% local
- Suporte a captura de áudio do sistema (chamadas, vídeos, reuniões online)
- Integração com `SFSpeechRecognizer` nativo no macOS para transcrição offline
- Suporte a múltiplos microfones com seleção e teste de dispositivo

#### Orientação de IA
- Geração automática de sugestões de resposta durante reuniões
- Orientação contextual baseada no histórico da transcrição ativa
- Suporte a presets de reunião: carregue documentos (currículo, proposta, escopo) antes da sessão
- Análise de slides e capturas de tela para contexto visual
- Respostas geradas localmente via Ollama ou via providers na nuvem (opcional)

#### Tradução em Tempo Real
- Tradução simultânea de transcrições para o idioma configurado
- Suporte a português, inglês, espanhol, francês, alemão, italiano, japonês, chinês e outros
- Processamento de tradução configurável: local ou via provider de IA

#### Stealth Overlay
- Janela de overlay flutuante, sempre no topo, invisível em compartilhamento de tela
- Exclusão de captura nativa no Windows (`WDA_EXCLUDEFROMCAPTURE`) e macOS (`set_content_protected`)
- Posicionamento automático na lateral direita do monitor com ajuste proporcional à altura da tela
- Hotkey configurável para mostrar/ocultar o overlay (padrão: `Ctrl+Shift+H`)
- Suporte a múltiplos monitores com seleção do monitor ativo

#### Histórico e Sessões
- Registro completo de todas as sessões com transcrição, sugestões e metadados
- Renomeação, exportação e exclusão de sessões passadas
- Geração de documentos de resumo pós-reunião
- Exportação de transcrições e follow-ups com um clique

#### Providers de IA
- Suporte nativo ao Ollama (modelos locais, zero dados na nuvem)
- Integração com providers OpenAI-compatible (OpenAI, Groq, OpenRouter, etc.)
- Configuração de roteamento de tarefas por modelo (transcrição, guidance, tradução, visão)
- Teste de conectividade e saúde de providers diretamente no app
- Perfil padrão local com Ollama pré-configurado no onboarding

#### Segurança e Privacidade
- Arquitetura local-first: nenhum dado trafega para servidores do Treplica
- Credenciais de providers armazenadas com criptografia AES-GCM + keyring do sistema
- Providers na nuvem são opt-in com aviso explícito de dados hospedados
- Configurações de privacidade granulares por funcionalidade

#### Infraestrutura e Deploy
- Builds automatizados via GitHub Actions para Windows, macOS e Linux
- Instaladores: `.msi` (Windows), `.dmg` universal (macOS), `.AppImage` e `.deb` (Linux)
- Sistema de atualização automática integrado (Tauri Updater)
- Site de landing com download dinâmico apontando para a release mais recente

### Corrigido

- Transcrição no macOS: adicionado `SFSpeechRecognizer` como provider padrão para funcionamento offline
- Permissões de microfone e captura de áudio do sistema no macOS (`Info.plist` e `Entitlements.plist`)
- Build de release Linux: dependências de sistema ALSA (`libasound2-dev`) adicionadas ao workflow de CI

### Problemas Conhecidos

- **macOS — aviso de desenvolvedor não identificado:** o `.dmg` desta versão não está assinado com certificado Apple. Ao abrir, clique com botão direito → Abrir para contornar o aviso do Gatekeeper.
- **Linux — transparência do overlay:** a transparência da janela de stealth requer um compositor ativo (GNOME Shell, KDE Plasma, Wayland). Em ambientes sem compositor (ex: i3 sem Picom), o fundo do overlay aparecerá sólido.
- **Linux — exclusão de captura de tela:** a funcionalidade de ocultar o overlay em gravações e compartilhamentos de tela não é suportada no Linux (`set_content_protected` não disponível). O overlay pode aparecer em OBS, Teams, Zoom, etc.
- **Ollama — modelos grandes:** modelos com mais de 7B parâmetros podem causar lentidão em máquinas com menos de 16 GB de RAM.

---

## Convenção de Versionamento

| Sufixo | Significado |
|--------|-------------|
| `-beta.N` | Versão pública em teste, pode ter breaking changes |
| `-rc.N` | Release candidate, estável para uso geral |
| Sem sufixo | Versão estável |

---

[Não publicado]: https://github.com/SimksS/treplica/compare/v0.1.1-beta.2...HEAD
[0.1.1-beta.2]: https://github.com/SimksS/treplica/compare/v0.1.0-beta.1...v0.1.1-beta.2
[0.1.0-beta.1]: https://github.com/SimksS/treplica/releases/tag/v0.1.0-beta.1
