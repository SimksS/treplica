//! Integration tests for provider health checks.
//!
//! ## Testes de alcançabilidade (sem credenciais reais)
//! Verificam se o servidor está no ar usando uma key falsa.
//! Uma resposta 401/403 prova que o endpoint existe e autentica.
//! Run with:
//!   cargo test -p provider-core --test provider_health reachability -- --nocapture
//!
//! ## Testes de saúde completos (requerem credenciais reais)
//! Verificam autenticação e que o modelo responde corretamente.
//! Run with:
//!   cargo test -p provider-core --test provider_health -- --ignored --nocapture
//!
//! Or a specific provider:
//!   cargo test -p provider-core --test provider_health openai -- --ignored --nocapture
//!
//! Required env vars per provider:
//!   Ollama:      TREPLICA_TEST_OLLAMA_URL (default: http://localhost:11434)
//!                TREPLICA_TEST_OLLAMA_MODEL (default: llama3.2)
//!   LM Studio:   TREPLICA_TEST_LMSTUDIO_URL (default: http://localhost:1234)
//!                TREPLICA_TEST_LMSTUDIO_MODEL (required)
//!   OpenAI:      TREPLICA_TEST_OPENAI_KEY (required)
//!                TREPLICA_TEST_OPENAI_MODEL (default: gpt-4o-mini)
//!   Groq:        TREPLICA_TEST_GROQ_KEY (required)
//!                TREPLICA_TEST_GROQ_MODEL (default: llama-3.3-70b-versatile)
//!   NVIDIA NIM:  TREPLICA_TEST_NVIDIA_KEY (required)
//!                TREPLICA_TEST_NVIDIA_MODEL (default: meta/llama-3.1-70b-instruct)
//!   OpenRouter:  TREPLICA_TEST_OPENROUTER_KEY (required)
//!                TREPLICA_TEST_OPENROUTER_MODEL (default: meta-llama/llama-3.3-70b-instruct)

use provider_core::ollama::OllamaAdapter;
use provider_core::openai_compatible::OpenAiCompatibleAdapter;

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.trim().is_empty())
}

fn env_or(key: &str, default: &str) -> String {
    env(key).unwrap_or_else(|| default.to_string())
}

/// Prints a prominent skip message so it's visible in output even without --nocapture.
macro_rules! skip_missing {
    ($var:expr) => {{
        eprintln!(
            "\n[SKIP] {} não definida — configure a variável para testar este provider.\n",
            $var
        );
        return;
    }};
}

// ── Alcançabilidade (sem credenciais reais) ───────────────────────────────────
//
// Estes testes NÃO requerem API keys. Usam uma key falsa e verificam se o
// servidor responde com 401/403 (servidor no ar) vs erro de rede (fora do ar).

fn probe(base_url: &str) -> OpenAiCompatibleAdapter {
    OpenAiCompatibleAdapter::new(base_url, "probe", Some("treplica-probe".into()), false, "probe")
}

#[tokio::test]
async fn reachability_openai() {
    match probe("https://api.openai.com/v1").ping().await {
        Ok(()) => println!("[OK] api.openai.com acessível"),
        Err(e) => panic!("[FAIL] api.openai.com inacessível: {e:?}"),
    }
}

#[tokio::test]
async fn reachability_groq() {
    match probe("https://api.groq.com/openai/v1").ping().await {
        Ok(()) => println!("[OK] api.groq.com acessível"),
        Err(e) => panic!("[FAIL] api.groq.com inacessível: {e:?}"),
    }
}

#[tokio::test]
async fn reachability_nvidia() {
    match probe("https://integrate.api.nvidia.com/v1").ping().await {
        Ok(()) => println!("[OK] integrate.api.nvidia.com acessível"),
        Err(e) => panic!("[FAIL] integrate.api.nvidia.com inacessível: {e:?}"),
    }
}

#[tokio::test]
async fn reachability_openrouter() {
    match probe("https://openrouter.ai/api/v1").ping().await {
        Ok(()) => println!("[OK] openrouter.ai acessível"),
        Err(e) => panic!("[FAIL] openrouter.ai inacessível: {e:?}"),
    }
}

// ── Ollama ────────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn ollama_ping() {
    let url = env_or("TREPLICA_TEST_OLLAMA_URL", "http://localhost:11434");
    match OllamaAdapter::ping(&url).await {
        Ok(()) => println!("[OK] Ollama acessível em {url}"),
        Err(e) => panic!("[FAIL] Ollama ping falhou: {e:?}"),
    }
}

#[tokio::test]
#[ignore]
async fn ollama_health_check() {
    let url = env_or("TREPLICA_TEST_OLLAMA_URL", "http://localhost:11434");
    let model = env_or("TREPLICA_TEST_OLLAMA_MODEL", "llama3.2");
    let adapter = OllamaAdapter::new(&url, &model);
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] Ollama health_check falhou: {e:?}"),
    }
}

// ── LM Studio (OpenAI-compatible, local) ─────────────────────────────────────

#[tokio::test]
#[ignore]
async fn lmstudio_health_check() {
    let url = env_or("TREPLICA_TEST_LMSTUDIO_URL", "http://localhost:1234/v1");
    let model = match env("TREPLICA_TEST_LMSTUDIO_MODEL") {
        Some(m) => m,
        None => skip_missing!("TREPLICA_TEST_LMSTUDIO_MODEL"),
    };
    let adapter = OpenAiCompatibleAdapter::new(&url, &model, None, true, "LM Studio");
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] LM Studio health_check falhou: {e:?}"),
    }
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn openai_health_check() {
    let key = match env("TREPLICA_TEST_OPENAI_KEY") {
        Some(k) => k,
        None => skip_missing!("TREPLICA_TEST_OPENAI_KEY"),
    };
    let model = env_or("TREPLICA_TEST_OPENAI_MODEL", "gpt-4o-mini");
    let adapter = OpenAiCompatibleAdapter::new(
        "https://api.openai.com/v1",
        &model,
        Some(key),
        false,
        "OpenAI",
    );
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] OpenAI health_check falhou: {e:?}"),
    }
}

#[tokio::test]
#[ignore]
async fn openai_whisper_health_check() {
    let key = match env("TREPLICA_TEST_OPENAI_KEY") {
        Some(k) => k,
        None => skip_missing!("TREPLICA_TEST_OPENAI_KEY"),
    };
    let model = env_or("TREPLICA_TEST_OPENAI_STT_MODEL", "whisper-1");
    let adapter = OpenAiCompatibleAdapter::new(
        "https://api.openai.com/v1",
        &model,
        Some(key),
        false,
        "OpenAI Whisper",
    );
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] OpenAI Whisper health_check falhou: {e:?}"),
    }
}

// ── Groq ──────────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn groq_health_check() {
    let key = match env("TREPLICA_TEST_GROQ_KEY") {
        Some(k) => k,
        None => skip_missing!("TREPLICA_TEST_GROQ_KEY"),
    };
    let model = env_or("TREPLICA_TEST_GROQ_MODEL", "llama-3.3-70b-versatile");
    let adapter = OpenAiCompatibleAdapter::new(
        "https://api.groq.com/openai/v1",
        &model,
        Some(key),
        false,
        "Groq",
    );
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] Groq health_check falhou: {e:?}"),
    }
}

#[tokio::test]
#[ignore]
async fn groq_whisper_health_check() {
    let key = match env("TREPLICA_TEST_GROQ_KEY") {
        Some(k) => k,
        None => skip_missing!("TREPLICA_TEST_GROQ_KEY"),
    };
    let model = env_or("TREPLICA_TEST_GROQ_STT_MODEL", "whisper-large-v3");
    let adapter = OpenAiCompatibleAdapter::new(
        "https://api.groq.com/openai/v1",
        &model,
        Some(key),
        false,
        "Groq Whisper",
    );
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] Groq Whisper health_check falhou: {e:?}"),
    }
}

// ── NVIDIA NIM ────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn nvidia_health_check() {
    let key = match env("TREPLICA_TEST_NVIDIA_KEY") {
        Some(k) => k,
        None => skip_missing!("TREPLICA_TEST_NVIDIA_KEY"),
    };
    let model = env_or(
        "TREPLICA_TEST_NVIDIA_MODEL",
        "meta/llama-3.1-70b-instruct",
    );
    let adapter = OpenAiCompatibleAdapter::new(
        "https://integrate.api.nvidia.com/v1",
        &model,
        Some(key),
        false,
        "NVIDIA NIM",
    );
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] NVIDIA NIM health_check falhou: {e:?}"),
    }
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn openrouter_health_check() {
    let key = match env("TREPLICA_TEST_OPENROUTER_KEY") {
        Some(k) => k,
        None => skip_missing!("TREPLICA_TEST_OPENROUTER_KEY"),
    };
    let model = env_or(
        "TREPLICA_TEST_OPENROUTER_MODEL",
        "meta-llama/llama-3.3-70b-instruct",
    );
    let adapter = OpenAiCompatibleAdapter::new(
        "https://openrouter.ai/api/v1",
        &model,
        Some(key),
        false,
        "OpenRouter",
    );
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] OpenRouter health_check falhou: {e:?}"),
    }
}

// ── Generic / Custom endpoint ─────────────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn custom_endpoint_health_check() {
    let url = match env("TREPLICA_TEST_CUSTOM_URL") {
        Some(u) => u,
        None => skip_missing!("TREPLICA_TEST_CUSTOM_URL"),
    };
    let model = match env("TREPLICA_TEST_CUSTOM_MODEL") {
        Some(m) => m,
        None => skip_missing!("TREPLICA_TEST_CUSTOM_MODEL"),
    };
    let key = env("TREPLICA_TEST_CUSTOM_KEY");
    let is_local = key.is_none();
    let adapter =
        OpenAiCompatibleAdapter::new(&url, &model, key, is_local, "Custom Endpoint");
    match adapter.health_check().await {
        Ok(msg) => println!("[OK] {msg}"),
        Err(e) => panic!("[FAIL] Custom endpoint health_check falhou: {e:?}"),
    }
}
