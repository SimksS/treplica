# Configuração de providers — Treplica

Treplica usa uma camada unificada de adapters (`provider-core`) para providers locais e hosted.

## Providers locais

### Ollama

1. Instale [Ollama](https://ollama.com)
2. Baixe um modelo de chat, por exemplo: `ollama pull llama3.2`
3. Em **Configurações → Providers**, use o provider Ollama padrão ou crie um com:
   - Base URL: `http://127.0.0.1:11434`
   - Modelo: nome do modelo local (ex. `llama3.2`)
4. Clique em **Testar** para validar configuração

### Endpoints OpenAI-compatible locais

- Tipo: `openai_compatible`
- Base URL: URL do servidor local (LM Studio, vLLM, etc.)
- Modelo: ID do modelo exposto pelo servidor
- Sem API key se o servidor não exigir autenticação

## Providers hosted

Requerem modo de privacidade diferente de `local_only` e aceite do aviso hosted.

| Provider | `provider_kind` | Base URL típica |
|----------|-----------------|-----------------|
| OpenAI | `openai` | `https://api.openai.com/v1` |
| Anthropic Claude | `anthropic` | `https://api.anthropic.com` |
| Groq | `groq` | `https://api.groq.com/openai/v1` |
| NVIDIA | `nvidia` | URL do endpoint NVIDIA configurado |
| Compatível OpenAI | `openai_compatible` | URL do gateway |

### Credenciais

1. Informe a API key no formulário de criação/edição
2. A chave é armazenada no `CredentialStore` (referência no banco, não o valor)
3. Testes de conexão validam URL/modelo e presença da chave — **não** logam a chave

## Teste e ativação

- **Testar**: valida configuração e credencial sem persistir segredos em auditoria
- **Ativar/Desativar**: controla qual provider pode ser usado em sessões
- Ollama padrão não pode ser excluído (apenas desativado)

## Privacidade por sessão

Mesmo com provider hosted configurado:

- `local_only` bloqueia na camada de adapter (`PrivacyBlocked`)
- `hosted_per_session` deve pedir confirmação na UI antes da chamada (fluxo de produto)
- Todas as chamadas hosted ficam em `provider_calls` com `local_or_hosted: hosted`

## Solução de problemas

| Sintoma | Ação |
|---------|------|
| Teste falha “API key not configured” | Recrie provider com chave ou atualize credencial |
| Ollama offline | Verifique `ollama serve` e firewall local |
| Hosted bloqueado | Confirme modo de privacidade e aviso aceito |
| Latência alta | Veja eventos `performance` na auditoria da sessão |
