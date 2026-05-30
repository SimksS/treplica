use serde::{Deserialize, Serialize};

use crate::{ProviderError, ProviderErrorCode, ProviderKind, ProviderResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostedProviderConfig {
    pub provider_kind: ProviderKind,
    pub display_name: String,
    pub base_url: String,
    pub model: String,
    pub credential_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAiHostedConfig {
    pub model: String,
    pub credential_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicHostedConfig {
    pub model: String,
    pub credential_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroqHostedConfig {
    pub model: String,
    pub credential_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaHostedConfig {
    pub model: String,
    pub base_url: String,
    pub credential_ref: Option<String>,
}

pub fn validate_hosted_config(config: &HostedProviderConfig) -> ProviderResult<()> {
    if config.base_url.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "hosted base_url is required",
        ));
    }
    if config.model.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "hosted model is required",
        ));
    }
    if config
        .credential_ref
        .as_ref()
        .map(|c| c.is_empty())
        .unwrap_or(true)
    {
        return Err(ProviderError::structured(
            ProviderErrorCode::AuthenticationFailed,
            "credential_ref is required for hosted providers",
        ));
    }
    Ok(())
}

pub fn default_openai() -> HostedProviderConfig {
    HostedProviderConfig {
        provider_kind: ProviderKind::Openai,
        display_name: "OpenAI".into(),
        base_url: "https://api.openai.com/v1".into(),
        model: "gpt-4o-mini".into(),
        credential_ref: None,
    }
}

pub fn default_anthropic() -> HostedProviderConfig {
    HostedProviderConfig {
        provider_kind: ProviderKind::Anthropic,
        display_name: "Anthropic Claude".into(),
        base_url: "https://api.anthropic.com".into(),
        model: "claude-3-5-sonnet-latest".into(),
        credential_ref: None,
    }
}

pub fn default_groq() -> HostedProviderConfig {
    HostedProviderConfig {
        provider_kind: ProviderKind::Groq,
        display_name: "Groq".into(),
        base_url: "https://api.groq.com/openai/v1".into(),
        model: "llama-3.3-70b-versatile".into(),
        credential_ref: None,
    }
}

pub fn default_nvidia() -> HostedProviderConfig {
    HostedProviderConfig {
        provider_kind: ProviderKind::Nvidia,
        display_name: "NVIDIA NIM".into(),
        base_url: "https://integrate.api.nvidia.com/v1".into(),
        model: "meta/llama-3.1-70b-instruct".into(),
        credential_ref: None,
    }
}
