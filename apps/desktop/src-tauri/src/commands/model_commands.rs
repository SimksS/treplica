use provider_core::ollama::OllamaAdapter;
use provider_core::tasks::{ModelTask, ModelRoutingConfig};
use provider_core::{GuidanceRequest, SessionContextInput};
use tauri::State;

use crate::commands::CommandResponse;
use crate::providers::adapter;
use crate::providers::privacy::{
    ensure_hosted_request_allowed, profile_privacy_from_repo, resolve_request_privacy,
};
use crate::providers::router::{self, ModelRoutingDto, ResolvedProvider};
use crate::storage::AppState;

#[derive(Debug, serde::Serialize)]
pub struct ModelTaskInfoDto {
    pub id: String,
    pub label: String,
    pub capability: String,
    pub assigned_provider_id: Option<String>,
    pub assigned_model: Option<String>,
}

#[tauri::command]
pub fn list_model_tasks(state: State<'_, AppState>) -> Result<CommandResponse<Vec<ModelTaskInfoDto>>, ()> {
    let routing = match state.app_settings.get() {
        Ok(s) => s.model_routing,
        Err(e) => return Ok(CommandResponse::failure("settings_error", e)),
    };
    let list: Vec<ModelTaskInfoDto> = ModelTask::all()
        .iter()
        .map(|task| ModelTaskInfoDto {
            id: task_id(*task).to_string(),
            label: task.label().to_string(),
            capability: format!("{:?}", task.capability()).to_lowercase(),
            assigned_provider_id: routing.provider_for(*task).map(str::to_string),
            assigned_model: routing.model_for(*task).map(str::to_string),
        })
        .collect();
    Ok(CommandResponse::success(list))
}

#[tauri::command]
pub fn get_model_routing(
    state: State<'_, AppState>,
) -> Result<CommandResponse<ModelRoutingDto>, ()> {
    match state.app_settings.get() {
        Ok(s) => Ok(CommandResponse::success(router::routing_dto(&s.model_routing))),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

#[tauri::command]
pub fn update_model_routing(
    state: State<'_, AppState>,
    routing: ModelRoutingDto,
) -> Result<CommandResponse<ModelRoutingDto>, ()> {
    let config: ModelRoutingConfig = routing.clone().into();
    match state.app_settings.set_model_routing(config) {
        Ok(()) => Ok(CommandResponse::success(routing)),
        Err(e) => Ok(CommandResponse::failure("settings_error", e)),
    }
}

#[tauri::command]
pub async fn test_model_task(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<CommandResponse<String>, ()> {
    let task = parse_task_id(&task_id);
    let (resolved, profile_mode) = match state.with_repo_str(|repo| {
        let profile_mode = profile_privacy_from_repo(repo)?;
        let resolved = if task == ModelTask::Transcription {
            router::resolve_for_transcription(&state, repo).map_err(|e| e.to_string())?
        } else {
            router::resolve_for_task(&state, repo, task).map_err(|e| e.to_string())?
        };
        Ok((resolved, profile_mode))
    }) {
        Ok(r) => r,
        Err(e) => return Ok(CommandResponse::failure("model_test_failed", e)),
    };

    match run_task_probe(task, &resolved, profile_mode).await {
        Ok(msg) => Ok(CommandResponse::success(msg)),
        Err(e) => Ok(CommandResponse::failure("model_test_failed", e)),
    }
}

fn task_id(task: ModelTask) -> &'static str {
    match task {
        ModelTask::Transcription => "transcription",
        ModelTask::Guidance => "guidance",
        ModelTask::Translation => "translation",
        ModelTask::Vision => "vision",
        ModelTask::Search => "search",
        ModelTask::Summarization => "summarization",
    }
}

fn parse_task_id(id: &str) -> ModelTask {
    match id {
        "transcription" => ModelTask::Transcription,
        "translation" => ModelTask::Translation,
        "vision" => ModelTask::Vision,
        "search" => ModelTask::Search,
        "summarization" => ModelTask::Summarization,
        _ => ModelTask::Guidance,
    }
}

async fn run_task_probe(
    task: ModelTask,
    resolved: &ResolvedProvider,
    profile_mode: local_store::models::PrivacyMode,
) -> Result<String, String> {
    ensure_hosted_request_allowed(profile_mode, resolved, true)?;
    let privacy = resolve_request_privacy(profile_mode, resolved, true)?;
    if resolved.provider_kind == "ollama" {
        OllamaAdapter::ping(&resolved.base_url)
            .await
            .map_err(|e| e.to_string())?;
    } else if resolved.api_key.as_ref().is_none_or(|k| k.trim().is_empty()) {
        return Err(format!(
            "API key não configurada para o provedor \"{}\" (id: {}). Edite em Provedores e salve a chave novamente, ou escolha outro provedor em Modelos por função.",
            resolved.id, resolved.provider_kind
        ));
    }

    match task {
        ModelTask::Guidance => {
            let resp = adapter::request_guidance(
                resolved,
                GuidanceRequest {
                    session_context: SessionContextInput {
                        role: Some("Test".into()),
                        objective: Some("Validar conexão".into()),
                        system_prompt: Some(
                            "Reply with exactly: TREPLICA_SYSTEM_OK".to_string(),
                        ),
                        ..Default::default()
                    },
                    recent_transcript: vec![provider_core::TranscriptSnippet {
                        speaker_label: Some("Teste".into()),
                        text: "Quanto é 1+1? Responda só o número.".into(),
                        confidence: 0.95,
                    }],
                    suggestion_type: None,
                    privacy_mode: privacy,
                    context_image_data_urls: vec![],
                    conversation: vec![],
                },
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(format!(
                "Orientação OK — {} ({} ms): {}",
                resolved.model,
                resp.latency_ms,
                resp.text.chars().take(120).collect::<String>()
            ))
        }
        ModelTask::Translation => {
            let resp = adapter::request_translation(
                resolved,
                provider_core::TranslationRequest {
                    source_language: "pt".into(),
                    target_language: "en".into(),
                    text: "Olá, teste de tradução.".into(),
                    context_hints: None,
                    privacy_mode: privacy,
                },
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(format!(
                "Tradução OK — {}: {}",
                resolved.model,
                resp.text.chars().take(80).collect::<String>()
            ))
        }
        ModelTask::Summarization => {
            let resp = adapter::request_document_generation(
                resolved,
                provider_core::DocumentGenerationRequest {
                    doc_type: "summary".into(),
                    session_title: "Teste".into(),
                    transcript_lines: vec!["Cliente: preciso de mais detalhes.".into()],
                    suggestion_lines: vec!["Sugerir demo.".into()],
                    privacy_mode: privacy,
                    system_prompt: None,
                },
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(format!(
                "Resumo OK — {} ({} caracteres)",
                resolved.model,
                resp.content.len()
            ))
        }
        ModelTask::Transcription => adapter::test_provider_health(resolved)
            .await
            .map_err(|e| e.to_string()),
        ModelTask::Vision | ModelTask::Search => Ok(format!(
            "{}: provedor {} em {} configurado. Visão/busca exigem integração dedicada.",
            task.label(),
            resolved.id,
            resolved.base_url
        )),
    }
}
