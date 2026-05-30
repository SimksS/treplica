use std::time::Duration;

use chrono::Utc;
use local_store::models::AiProviderConfiguration;
use local_store::provider_repository::ProviderRepository;
use provider_core::hosted::{validate_hosted_config, HostedProviderConfig};
use provider_core::ollama::{validate_configuration, OllamaAdapter};
use provider_core::ProviderKind;
use serde::Deserialize;
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::commands::CommandResponse;
use crate::providers::router::{self, TranscriptionAvailabilityDto};
use crate::providers::url_validation::validate_provider_base_url;
use crate::storage::AppState;

pub(crate) const HOSTED_CAPABILITIES_JSON: &str =
    r#"["chat","streaming","translation","summarization","structured_output","transcription","vision","search"]"#;

#[derive(Debug, serde::Serialize)]
pub struct ProviderConfigDto {
    pub id: String,
    pub provider_kind: String,
    pub display_name: String,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub enabled: bool,
    pub local_only: bool,
    pub has_credential: bool,
    /// `Some(true|false)` when the app probes a local daemon (Ollama); `None` for hosted APIs.
    pub server_reachable: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProviderInput {
    pub provider_kind: String,
    pub display_name: String,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub local_only: bool,
    pub api_key: Option<String>,
    #[serde(default)]
    pub allow_custom_endpoint: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProviderInput {
    pub display_name: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub local_only: Option<bool>,
    pub enabled: Option<bool>,
    pub api_key: Option<String>,
    #[serde(default)]
    pub allow_custom_endpoint: bool,
}

fn validate_config_urls(
    provider_kind: &str,
    base_url: Option<&str>,
    allow_custom_endpoint: bool,
) -> Result<(), String> {
    if provider_kind == "ollama" {
        if let Some(url) = base_url.filter(|u| !u.trim().is_empty()) {
            validate_provider_base_url(provider_kind, url, allow_custom_endpoint)?;
        }
        return Ok(());
    }
    let url = base_url
        .filter(|u| !u.trim().is_empty())
        .ok_or_else(|| "base_url is required for hosted providers".to_string())?;
    validate_provider_base_url(provider_kind, url, allow_custom_endpoint)
}

fn to_dto(
    config: AiProviderConfiguration,
    has_credential: bool,
    server_reachable: Option<bool>,
) -> ProviderConfigDto {
    ProviderConfigDto {
        id: config.id,
        provider_kind: config.provider_kind,
        display_name: config.display_name,
        base_url: config.base_url,
        model: config.model,
        enabled: config.enabled,
        local_only: config.local_only,
        has_credential,
        server_reachable,
    }
}

async fn probe_server_reachable(config: &AiProviderConfiguration) -> Option<bool> {
    if config.provider_kind != "ollama" {
        return None;
    }
    let base = config
        .base_url
        .as_deref()
        .filter(|u| !u.trim().is_empty())
        .unwrap_or("http://127.0.0.1:11434");
    Some(
        OllamaAdapter::ping_with_timeout(base, Duration::from_secs(3))
            .await
            .is_ok(),
    )
}

fn normalize_base_url(url: Option<&str>) -> String {
    url.map(|u| u.trim().trim_end_matches('/').to_lowercase())
        .unwrap_or_default()
}

/// Reuses an existing vault key when adding another model on the same API endpoint.
fn find_shared_credential_ref(
    state: &AppState,
    providers: &[AiProviderConfiguration],
    provider_kind: &str,
    base_url: Option<&str>,
) -> Option<String> {
    if provider_kind == "ollama" {
        return None;
    }
    let target = normalize_base_url(base_url);
    for p in providers {
        if p.provider_kind != provider_kind {
            continue;
        }
        if !target.is_empty() && normalize_base_url(p.base_url.as_deref()) != target {
            continue;
        }
        let Some(cref) = p.credential_ref.as_ref() else {
            continue;
        };
        if state
            .credentials
            .get(cref)
            .ok()
            .flatten()
            .is_some_and(|k| !k.trim().is_empty())
        {
            return Some(cref.clone());
        }
    }
    None
}

fn map_kind(kind: &str) -> ProviderKind {
    match kind {
        "openai" => ProviderKind::Openai,
        "anthropic" => ProviderKind::Anthropic,
        "groq" => ProviderKind::Groq,
        "nvidia" => ProviderKind::Nvidia,
        "openai_compatible" => ProviderKind::OpenaiCompatible,
        _ => ProviderKind::Ollama,
    }
}

#[tauri::command]
pub async fn list_provider_configs(
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<ProviderConfigDto>>, ()> {
    let providers =
        match state.with_repo(|repo| ProviderRepository::new(repo.conn()).list_providers()) {
            Ok(p) => p,
            Err(e) => return Ok(CommandResponse::failure("provider_error", e)),
        };
    let mut list = Vec::with_capacity(providers.len());
    for p in providers {
        let has = p.credential_ref.as_ref().is_some_and(|r| state.credentials.has(r));
        let server_reachable = probe_server_reachable(&p).await;
        list.push(to_dto(p, has, server_reachable));
    }
    Ok(CommandResponse::success(list))
}

#[tauri::command]
pub fn get_transcription_availability(
    state: State<'_, AppState>,
) -> Result<CommandResponse<TranscriptionAvailabilityDto>, ()> {
    match state.with_repo(|repo| {
        Ok(router::transcription_availability(&state, repo))
    }) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("provider_error", e)),
    }
}

#[tauri::command]
pub fn create_provider_config(
    state: State<'_, AppState>,
    input: CreateProviderInput,
) -> Result<CommandResponse<ProviderConfigDto>, ()> {
    if let Err(e) = validate_config_urls(
        &input.provider_kind,
        input.base_url.as_deref(),
        input.allow_custom_endpoint,
    ) {
        return Ok(CommandResponse::failure("provider_error", e));
    }

    let id = Uuid::new_v4().to_string();
    let api_key = input
        .api_key
        .as_ref()
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty());
    let existing_providers = state
        .with_repo(|repo| ProviderRepository::new(repo.conn()).list_providers())
        .unwrap_or_default();

    let credential_ref = if api_key.is_some() {
        Some(format!("cred-{id}"))
    } else {
        find_shared_credential_ref(
            &state,
            &existing_providers,
            &input.provider_kind,
            input.base_url.as_deref(),
        )
    };
    if let (Some(key), Some(ref cref)) = (api_key.as_ref(), &credential_ref) {
        if let Err(e) = state.credentials.store(cref, key.clone()) {
            return Ok(CommandResponse::failure("provider_error", e));
        }
    }
    let now = Utc::now();
    let config = AiProviderConfiguration {
        id: id.clone(),
        provider_kind: input.provider_kind.clone(),
        display_name: input.display_name,
        base_url: input.base_url,
        model: input.model,
        capabilities_json: HOSTED_CAPABILITIES_JSON.into(),
        credential_ref: credential_ref.clone(),
        enabled: true,
        local_only: input.local_only,
        created_at: now,
        updated_at: now,
    };
    if let Err(e) =
        state.with_repo(|repo| ProviderRepository::new(repo.conn()).insert_provider(&config))
    {
        return Ok(CommandResponse::failure("provider_error", e));
    }
    let has = credential_ref
        .as_ref()
        .is_some_and(|r| state.credentials.has(r));
    Ok(CommandResponse::success(to_dto(config, has, None)))
}

#[tauri::command]
pub fn update_provider_config(
    state: State<'_, AppState>,
    provider_id: String,
    input: UpdateProviderInput,
) -> Result<CommandResponse<ProviderConfigDto>, ()> {
    let mut config = match state
        .with_repo(|repo| ProviderRepository::new(repo.conn()).get_provider(&provider_id))
    {
        Ok(c) => c,
        Err(e) => return Ok(CommandResponse::failure("provider_error", e)),
    };
    let allow_custom = input.allow_custom_endpoint;
    if let Some(name) = input.display_name {
        config.display_name = name;
    }
    if input.base_url.is_some() {
        config.base_url = input.base_url.clone();
    }
    if let Err(e) = validate_config_urls(
        &config.provider_kind,
        config.base_url.as_deref(),
        allow_custom,
    ) {
        return Ok(CommandResponse::failure("provider_error", e));
    }
    if input.model.is_some() {
        config.model = input.model;
    }
    if let Some(local) = input.local_only {
        config.local_only = local;
    }
    if let Some(enabled) = input.enabled {
        config.enabled = enabled;
    }
    if let Some(key) = input.api_key {
        let key = key.trim().to_string();
        if key.is_empty() {
            if let Some(ref cref) = config.credential_ref {
                if let Err(e) = state.credentials.delete(cref) {
                    return Ok(CommandResponse::failure("provider_error", e));
                }
            }
            config.credential_ref = None;
        } else {
            let cref = config
                .credential_ref
                .clone()
                .unwrap_or_else(|| format!("cred-{}", config.id));
            if let Err(e) = state.credentials.store(&cref, key) {
                return Ok(CommandResponse::failure("provider_error", e));
            }
            config.credential_ref = Some(cref);
        }
    }
    config.updated_at = Utc::now();
    if let Err(e) =
        state.with_repo(|repo| ProviderRepository::new(repo.conn()).update_provider(&config))
    {
        return Ok(CommandResponse::failure("provider_error", e));
    }
    let has = config
        .credential_ref
        .as_ref()
        .is_some_and(|r| state.credentials.has(r));
    Ok(CommandResponse::success(to_dto(config, has, None)))
}

#[tauri::command]
pub fn enable_provider_config(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<CommandResponse<ProviderConfigDto>, ()> {
    match state.with_repo(|repo| {
        let store = ProviderRepository::new(repo.conn());
        store.set_provider_enabled(&provider_id, true)?;
        let config = store.get_provider(&provider_id)?;
        let has = config
            .credential_ref
            .as_ref()
            .is_some_and(|r| state.credentials.has(r));
        Ok(to_dto(config, has, None))
    }) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("provider_error", e)),
    }
}

#[tauri::command]
pub fn disable_provider_config(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<CommandResponse<ProviderConfigDto>, ()> {
    match state.with_repo(|repo| {
        let store = ProviderRepository::new(repo.conn());
        store.set_provider_enabled(&provider_id, false)?;
        let config = store.get_provider(&provider_id)?;
        let has = config
            .credential_ref
            .as_ref()
            .is_some_and(|r| state.credentials.has(r));
        Ok(to_dto(config, has, None))
    }) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("provider_error", e)),
    }
}

#[tauri::command]
pub fn delete_provider_config(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<CommandResponse<()>, ()> {
    if let Ok(config) =
        state.with_repo(|repo| ProviderRepository::new(repo.conn()).get_provider(&provider_id))
    {
        if let Some(ref cref) = config.credential_ref {
            let _ = state.credentials.delete(cref);
        }
    }
    match state.with_repo(|repo| ProviderRepository::new(repo.conn()).delete_provider(&provider_id))
    {
        Ok(()) => {
            if let Ok(mut settings) = state.app_settings.get() {
                settings.model_routing.clear_provider_references(&provider_id);
                let _ = state.app_settings.set_model_routing(settings.model_routing);
            }
            Ok(CommandResponse::success(()))
        }
        Err(e) => Ok(CommandResponse::failure("provider_error", e)),
    }
}

#[tauri::command]
pub async fn test_provider_config(
    _app: AppHandle,
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<CommandResponse<String>, ()> {
    let config = match state
        .with_repo(|repo| ProviderRepository::new(repo.conn()).get_provider(&provider_id))
    {
        Ok(c) => c,
        Err(e) => return Ok(CommandResponse::failure("provider_test_failed", e)),
    };

    // Re-validate the stored URL before issuing any network request. This guards against
    // configs that were inserted outside the normal create/update path. We use
    // allow_custom_endpoint=true so legitimate custom endpoints still pass; the strengthened
    // is_private_ip_range check in validate_provider_base_url still blocks internal hosts.
    if let Err(e) = validate_config_urls(
        &config.provider_kind,
        config.base_url.as_deref(),
        true,
    ) {
        return Ok(CommandResponse::failure("provider_test_failed", e));
    }

    let result = if config.provider_kind == "ollama" {
        let base = config.base_url.clone().unwrap_or_default();
        if let Err(e) = validate_configuration(Some(&base), config.model.as_deref()) {
            Err(e.to_string())
        } else {
            let adapter = provider_core::ollama::OllamaAdapter::new(
                base,
                config.model.clone().unwrap_or_default(),
            );
            adapter.health_check().await.map_err(|e| e.to_string())
        }
    } else {
        let base = config.base_url.clone().unwrap_or_default();
        let model = config.model.clone().unwrap_or_default();
        let api_key = config
            .credential_ref
            .as_ref()
            .and_then(|r| state.credentials.get(r).ok().flatten());
        let hosted = HostedProviderConfig {
            provider_kind: map_kind(&config.provider_kind),
            display_name: config.display_name.clone(),
            base_url: base.clone(),
            model: model.clone(),
            credential_ref: config.credential_ref.clone(),
        };
        if let Err(e) = validate_hosted_config(&hosted) {
            Err(e.to_string())
        } else if api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
            Err("API key not configured".into())
        } else {
            let resolved = crate::providers::router::ResolvedProvider {
                id: config.id.clone(),
                provider_kind: config.provider_kind.clone(),
                base_url: base,
                model,
                api_key,
                local_only: config.local_only,
            };
            crate::providers::adapter::test_provider_health(&resolved)
                .await
                .map_err(|e| e.to_string())
        }
    };

    match result {
        Ok(msg) => Ok(CommandResponse::success(msg)),
        Err(e) => Ok(CommandResponse::failure("provider_test_failed", e)),
    }
}
