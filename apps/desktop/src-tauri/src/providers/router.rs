use local_store::models::AiProviderConfiguration;
use local_store::provider_repository::ProviderRepository;
use local_store::repositories::StoreRepositories;
use provider_core::health::{is_transcription_model, resolve_chat_model, resolve_stt_model};
use provider_core::hosted::{default_groq, default_nvidia, default_openai};
use provider_core::tasks::{ModelRoutingConfig, ModelTask};
use provider_core::ProviderCapability;

use crate::storage::AppState;

#[derive(Debug, Clone)]
pub struct ResolvedProvider {
    pub id: String,
    pub provider_kind: String,
    pub base_url: String,
    pub model: String,
    pub api_key: Option<String>,
    pub local_only: bool,
}

/// Provider kinds that implement Whisper-compatible `/audio/transcriptions`.
pub fn provider_kind_supports_cloud_transcription(kind: &str) -> bool {
    matches!(
        kind,
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api"
    )
}

fn normalize_base_url(url: Option<&str>) -> String {
    url.map(|u| u.trim().trim_end_matches('/').to_lowercase())
        .unwrap_or_default()
}

fn credential_key(state: &AppState, credential_ref: Option<&str>) -> Option<String> {
    let r = credential_ref?;
    let key = state.credentials.get(r).ok().flatten()?;
    if key.trim().is_empty() {
        None
    } else {
        Some(key)
    }
}

fn shared_credential_key(
    state: &AppState,
    all_providers: &[AiProviderConfiguration],
    config: &AiProviderConfiguration,
) -> Option<String> {
    let target = normalize_base_url(config.base_url.as_deref());
    for p in all_providers {
        if p.id == config.id || p.provider_kind != config.provider_kind {
            continue;
        }
        if !target.is_empty() && normalize_base_url(p.base_url.as_deref()) != target {
            continue;
        }
        if let Some(key) = credential_key(state, p.credential_ref.as_deref()) {
            return Some(key);
        }
    }
    None
}

fn provider_has_usable_api_key(
    state: &AppState,
    config: &AiProviderConfiguration,
    all_providers: &[AiProviderConfiguration],
) -> bool {
    if config.local_only || config.provider_kind == "ollama" {
        return true;
    }
    credential_key(state, config.credential_ref.as_deref()).is_some()
        || shared_credential_key(state, all_providers, config).is_some()
}

fn provider_supports_task_config(config: &AiProviderConfiguration, task: ModelTask) -> bool {
    if provider_supports_task(config, task) {
        return true;
    }
    if task != ModelTask::Vision {
        return false;
    }
    let model = config.model.as_deref().unwrap_or("");
    if is_transcription_model(model) {
        return false;
    }
    let caps: Vec<String> =
        serde_json::from_str(&config.capabilities_json).unwrap_or_else(|_| vec!["chat".into()]);
    caps.iter().any(|c| c == "chat" || c == "vision")
}

pub fn provider_ready_for_hosted_task(
    state: &AppState,
    config: &AiProviderConfiguration,
    task: ModelTask,
    all_providers: &[AiProviderConfiguration],
) -> bool {
    if !config.enabled || !provider_supports_task_config(config, task) {
        return false;
    }
    if config.provider_kind == "ollama" || config.local_only {
        return true;
    }
    provider_has_usable_api_key(state, config, all_providers)
}

pub fn provider_ready_for_cloud_transcription(
    state: &AppState,
    config: &AiProviderConfiguration,
    all_providers: &[AiProviderConfiguration],
) -> bool {
    if !config.enabled || !provider_supports_task(config, ModelTask::Transcription) {
        return false;
    }
    if !provider_kind_supports_cloud_transcription(&config.provider_kind) {
        return false;
    }
    provider_has_usable_api_key(state, config, all_providers)
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TranscriptionAvailabilityDto {
    pub cloud_available: bool,
    pub provider_id: Option<String>,
    pub provider_display_name: Option<String>,
    /// Model id sent to `/audio/transcriptions` (Whisper).
    pub stt_model: Option<String>,
    /// Model configured on the provider connection (may be chat-only).
    pub connection_model: Option<String>,
    pub stt_model_is_fallback: bool,
}

pub fn transcription_availability(
    state: &AppState,
    repo: &StoreRepositories<'_>,
) -> TranscriptionAvailabilityDto {
    let store = ProviderRepository::new(repo.conn());
    match resolve_for_transcription(state, repo) {
        Ok(p) => {
            let config = store.get_provider(&p.id).ok();
            let display_name = config.as_ref().map(|c| c.display_name.clone());
            let connection_model = config.and_then(|c| c.model.clone());
            let configured = connection_model.clone().unwrap_or_else(|| p.model.clone());
            let stt_model_is_fallback = !is_transcription_model(&configured);
            TranscriptionAvailabilityDto {
                cloud_available: true,
                provider_id: Some(p.id),
                provider_display_name: display_name,
                stt_model: Some(p.model),
                connection_model,
                stt_model_is_fallback,
            }
        }
        Err(_) => TranscriptionAvailabilityDto {
            cloud_available: false,
            provider_id: None,
            provider_display_name: None,
            stt_model: None,
            connection_model: None,
            stt_model_is_fallback: false,
        },
    }
}

fn apply_transcription_stt_model(mut resolved: ResolvedProvider) -> ResolvedProvider {
    let configured = resolved.model.clone();
    resolved.model = resolve_stt_model(
        &configured,
        &resolved.base_url,
        &resolved.provider_kind,
    );
    resolved
}

/// Resolves a provider for speech-to-text (Whisper-compatible API).
pub fn resolve_for_transcription(
    state: &AppState,
    repo: &StoreRepositories<'_>,
) -> Result<ResolvedProvider, String> {
    let routing = state
        .app_settings
        .get()
        .map(|s| s.model_routing)
        .unwrap_or_default();
    let store = ProviderRepository::new(repo.conn());
    let providers = store.list_providers().map_err(|e| e.to_string())?;

    if let Some(id) = routing
        .transcription_provider_id
        .as_ref()
        .filter(|s| !s.is_empty())
    {
        if let Ok(config) = store.get_provider(id) {
            if provider_ready_for_cloud_transcription(state, &config, &providers) {
                return config_to_resolved(state, config, &providers)
                    .map(apply_transcription_stt_model)
                    .map(|r| apply_routing_model(r, ModelTask::Transcription, &routing));
            }
        }
    }

    providers
        .iter()
        .filter(|p| provider_ready_for_cloud_transcription(state, p, &providers))
        .find_map(|p| {
            config_to_resolved(state, p.clone(), &providers)
                .ok()
                .map(apply_transcription_stt_model)
                .map(|r| apply_routing_model(r, ModelTask::Transcription, &routing))
        })
        .ok_or_else(|| {
            "nenhum provedor de transcrição na nuvem configurado (API key + Groq/OpenAI/NVIDIA)"
                .into()
        })
}

pub fn resolve_for_task(
    state: &AppState,
    repo: &StoreRepositories<'_>,
    task: ModelTask,
) -> Result<ResolvedProvider, String> {
    let routing = state
        .app_settings
        .get()
        .map(|s| s.model_routing)
        .unwrap_or_default();
    let store = ProviderRepository::new(repo.conn());
    let providers = store.list_providers().map_err(|e| e.to_string())?;

    if let Some(id) = routing
        .provider_for(task)
        .map(str::to_string)
        .filter(|s| !s.is_empty())
    {
        if let Ok(config) = store.get_provider(&id) {
            if provider_ready_for_hosted_task(state, &config, task, &providers) {
                return config_to_resolved(state, config, &providers)
                    .map(|r| apply_routing_model(r, task, &routing));
            }
            let reason = resolve_task_failure_reason(state, &config, task, &providers);
            return Err(format!(
                "conexão \"{}\" não pode ser usada para {}: {}",
                config.display_name,
                task.label(),
                reason
            ));
        }
    }

    if task == ModelTask::Vision {
        if let Some(id) = routing
            .guidance_provider_id
            .as_ref()
            .filter(|s| !s.is_empty())
        {
            if let Ok(config) = store.get_provider(id) {
                if provider_ready_for_hosted_task(state, &config, task, &providers) {
                    return config_to_resolved(state, config, &providers)
                        .map(|r| apply_routing_model(r, task, &routing));
                }
            }
        }
    }

    providers
        .iter()
        .filter(|p| provider_ready_for_hosted_task(state, p, task, &providers))
        .find_map(|p| {
            config_to_resolved(state, p.clone(), &providers)
                .ok()
                .map(|r| apply_routing_model(r, task, &routing))
        })
        .ok_or_else(|| format!("nenhuma conexão disponível para {}", task.label()))
}

fn resolve_task_failure_reason(
    state: &AppState,
    config: &AiProviderConfiguration,
    task: ModelTask,
    all_providers: &[AiProviderConfiguration],
) -> String {
    if !provider_supports_task_config(config, task) {
        let model = config.model.as_deref().unwrap_or("?");
        if task == ModelTask::Vision && is_transcription_model(model) {
            return format!(
                "o modelo \"{model}\" é de transcrição (Whisper); escolha uma conexão multimodal como Llama 4 Scout em Modelos por função → Reconhecimento de imagem"
            );
        }
        return "capability ausente — reinicie o app para atualizar provedores antigos".into();
    }
    if !provider_has_usable_api_key(state, config, all_providers) {
        return "API key ausente; adicione na primeira conexão deste provedor ou reutilize a chave salva".into();
    }
    "configuração inválida".into()
}

fn apply_chat_task_model(mut resolved: ResolvedProvider) -> ResolvedProvider {
    let configured = resolved.model.clone();
    resolved.model = resolve_chat_model(
        &configured,
        &resolved.base_url,
        &resolved.provider_kind,
    );
    resolved
}

fn apply_routing_model(
    mut resolved: ResolvedProvider,
    task: ModelTask,
    routing: &ModelRoutingConfig,
) -> ResolvedProvider {
    if let Some(model) = routing.model_for(task).filter(|m| !m.trim().is_empty()) {
        resolved.model = model.trim().to_string();
    }
    match task {
        ModelTask::Transcription => apply_transcription_stt_model(resolved),
        ModelTask::Translation
        | ModelTask::Guidance
        | ModelTask::Vision
        | ModelTask::Summarization
        | ModelTask::Search => apply_chat_task_model(resolved),
    }
}

fn default_base_url_for_kind(kind: &str) -> String {
    match kind {
        "openai" => default_openai().base_url,
        "groq" => default_groq().base_url,
        "nvidia" => default_nvidia().base_url,
        "ollama" => "http://127.0.0.1:11434".into(),
        _ => String::new(),
    }
}

fn default_model_for_kind(kind: &str) -> String {
    match kind {
        "openai" => default_openai().model,
        "groq" => default_groq().model,
        "nvidia" => default_nvidia().model,
        "ollama" => "llama3.2".into(),
        _ => String::new(),
    }
}

fn config_to_resolved(
    state: &AppState,
    config: AiProviderConfiguration,
    all_providers: &[AiProviderConfiguration],
) -> Result<ResolvedProvider, String> {
    let api_key = credential_key(state, config.credential_ref.as_deref())
        .or_else(|| shared_credential_key(state, all_providers, &config));

    let base_url = config
        .base_url
        .filter(|u| !u.is_empty())
        .unwrap_or_else(|| default_base_url_for_kind(&config.provider_kind));
    let model = config
        .model
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| default_model_for_kind(&config.provider_kind));

    match config.provider_kind.as_str() {
        "ollama" => Ok(ResolvedProvider {
            id: config.id,
            provider_kind: config.provider_kind,
            base_url,
            model,
            api_key,
            local_only: true,
        }),
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            if base_url.is_empty() {
                return Err(format!(
                    "provider {} precisa de base URL (ex.: NVIDIA: https://integrate.api.nvidia.com/v1)",
                    config.display_name
                ));
            }
            if model.is_empty() {
                return Err(format!(
                    "provider {} precisa do id do modelo na API",
                    config.display_name
                ));
            }
            Ok(ResolvedProvider {
                id: config.id,
                provider_kind: config.provider_kind,
                base_url,
                model,
                api_key,
                local_only: config.local_only,
            })
        }
        other => Err(format!(
            "provider {} ({other}) is not supported for live calls yet",
            config.display_name
        )),
    }
}

fn provider_supports_task(config: &AiProviderConfiguration, task: ModelTask) -> bool {
    let needed = capability_key(task.capability());
    let caps: Vec<String> =
        serde_json::from_str(&config.capabilities_json).unwrap_or_else(|_| vec!["chat".into()]);
    caps.iter().any(|c| c == &needed)
}

fn capability_key(cap: ProviderCapability) -> String {
    match cap {
        ProviderCapability::Chat => "chat",
        ProviderCapability::Streaming => "streaming",
        ProviderCapability::Translation => "translation",
        ProviderCapability::Summarization => "summarization",
        ProviderCapability::StructuredOutput => "structured_output",
        ProviderCapability::Transcription => "transcription",
        ProviderCapability::Vision => "vision",
        ProviderCapability::Search => "search",
    }
    .to_string()
}

pub fn routing_dto(routing: &ModelRoutingConfig) -> ModelRoutingDto {
    ModelRoutingDto {
        transcription_provider_id: routing.transcription_provider_id.clone(),
        guidance_provider_id: routing.guidance_provider_id.clone(),
        translation_provider_id: routing.translation_provider_id.clone(),
        vision_provider_id: routing.vision_provider_id.clone(),
        search_provider_id: routing.search_provider_id.clone(),
        summarization_provider_id: routing.summarization_provider_id.clone(),
        transcription_model: routing.transcription_model.clone(),
        guidance_model: routing.guidance_model.clone(),
        translation_model: routing.translation_model.clone(),
        vision_model: routing.vision_model.clone(),
        search_model: routing.search_model.clone(),
        summarization_model: routing.summarization_model.clone(),
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelRoutingDto {
    pub transcription_provider_id: Option<String>,
    pub guidance_provider_id: Option<String>,
    pub translation_provider_id: Option<String>,
    pub vision_provider_id: Option<String>,
    pub search_provider_id: Option<String>,
    pub summarization_provider_id: Option<String>,
    #[serde(default)]
    pub transcription_model: Option<String>,
    #[serde(default)]
    pub guidance_model: Option<String>,
    #[serde(default)]
    pub translation_model: Option<String>,
    #[serde(default)]
    pub vision_model: Option<String>,
    #[serde(default)]
    pub search_model: Option<String>,
    #[serde(default)]
    pub summarization_model: Option<String>,
}

impl From<ModelRoutingDto> for ModelRoutingConfig {
    fn from(dto: ModelRoutingDto) -> Self {
        ModelRoutingConfig {
            transcription_provider_id: dto.transcription_provider_id,
            guidance_provider_id: dto.guidance_provider_id,
            translation_provider_id: dto.translation_provider_id,
            vision_provider_id: dto.vision_provider_id,
            search_provider_id: dto.search_provider_id,
            summarization_provider_id: dto.summarization_provider_id,
            transcription_model: dto.transcription_model,
            guidance_model: dto.guidance_model,
            translation_model: dto.translation_model,
            vision_model: dto.vision_model,
            search_model: dto.search_model,
            summarization_model: dto.summarization_model,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cloud_transcription_kinds_exclude_ollama() {
        assert!(provider_kind_supports_cloud_transcription("groq"));
        assert!(!provider_kind_supports_cloud_transcription("ollama"));
    }
}
