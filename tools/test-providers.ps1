# Testa todos os providers configurados via variáveis de ambiente.
# Uso: .\tools\test-providers.ps1
#
# Configure as chaves antes de rodar:
#   $env:TREPLICA_TEST_OPENAI_KEY    = "sk-..."
#   $env:TREPLICA_TEST_GROQ_KEY      = "gsk_..."
#   $env:TREPLICA_TEST_NVIDIA_KEY    = "nvapi-..."
#   $env:TREPLICA_TEST_OPENROUTER_KEY = "sk-or-..."
#
# Ollama e LM Studio são detectados automaticamente se estiverem rodando localmente.

cargo test -p provider-core --test provider_health -- --ignored --nocapture
