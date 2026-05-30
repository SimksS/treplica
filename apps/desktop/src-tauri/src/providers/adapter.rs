use provider_core::ollama::OllamaAdapter;
use provider_core::openai_compatible::OpenAiCompatibleAdapter;
use provider_core::{
    DocumentGenerationRequest, DocumentGenerationResponse, GuidanceRequest, GuidanceResponse,
    ProviderAdapter, TranscriptionRequest, TranscriptionResponse, TranslationRequest,
    TranslationResponse, VisionRequest, VisionResponse,
};

use super::router::ResolvedProvider;

pub fn ollama_from_resolved(resolved: &ResolvedProvider) -> OllamaAdapter {
    OllamaAdapter::new(&resolved.base_url, &resolved.model)
}

fn openai_from_resolved(resolved: &ResolvedProvider) -> OpenAiCompatibleAdapter {
    OpenAiCompatibleAdapter::new(
        &resolved.base_url,
        &resolved.model,
        resolved.api_key.clone(),
        resolved.local_only,
        &resolved.id,
    )
}

pub async fn request_guidance(
    resolved: &ResolvedProvider,
    request: GuidanceRequest,
) -> Result<GuidanceResponse, provider_core::ProviderError> {
    match resolved.provider_kind.as_str() {
        "ollama" => ollama_from_resolved(resolved).request_guidance(request).await,
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            openai_from_resolved(resolved)
                .request_guidance(request)
                .await
        }
        other => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            format!("provider kind '{other}' is not wired for guidance"),
        )),
    }
}

pub async fn request_translation(
    resolved: &ResolvedProvider,
    request: TranslationRequest,
) -> Result<TranslationResponse, provider_core::ProviderError> {
    match resolved.provider_kind.as_str() {
        "ollama" => ollama_from_resolved(resolved).request_translation(request).await,
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            openai_from_resolved(resolved)
                .request_translation(request)
                .await
        }
        other => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            format!("provider kind '{other}' is not wired for translation"),
        )),
    }
}

pub async fn request_transcription(
    resolved: &ResolvedProvider,
    request: TranscriptionRequest,
) -> Result<TranscriptionResponse, provider_core::ProviderError> {
    match resolved.provider_kind.as_str() {
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            openai_from_resolved(resolved)
                .request_transcription(request)
                .await
        }
        "ollama" => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            "Ollama não suporta transcrição de áudio do sistema; use OpenAI, Groq ou NVIDIA no roteamento de Transcrição",
        )),
        other => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            format!("provider kind '{other}' is not wired for transcription"),
        )),
    }
}

pub async fn request_vision_analysis(
    resolved: &ResolvedProvider,
    request: VisionRequest,
) -> Result<VisionResponse, provider_core::ProviderError> {
    match resolved.provider_kind.as_str() {
        "ollama" => ollama_from_resolved(resolved).analyze_image(request).await,
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            openai_from_resolved(resolved)
                .analyze_image(request)
                .await
        }
        other => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            format!("provider kind '{other}' não suporta análise de imagem"),
        )),
    }
}

pub async fn test_provider_health(resolved: &ResolvedProvider) -> Result<String, provider_core::ProviderError> {
    match resolved.provider_kind.as_str() {
        "ollama" => ollama_from_resolved(resolved).health_check().await,
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            openai_from_resolved(resolved).health_check().await
        }
        other => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            format!("provider kind '{other}' não suporta teste de conexão"),
        )),
    }
}

pub async fn request_document_generation(
    resolved: &ResolvedProvider,
    request: DocumentGenerationRequest,
) -> Result<DocumentGenerationResponse, provider_core::ProviderError> {
    match resolved.provider_kind.as_str() {
        "ollama" => {
            ollama_from_resolved(resolved)
                .request_document_generation(request)
                .await
        }
        "openai" | "groq" | "nvidia" | "openai_compatible" | "custom_api" => {
            openai_from_resolved(resolved)
                .request_document_generation(request)
                .await
        }
        other => Err(provider_core::ProviderError::structured(
            provider_core::ProviderErrorCode::InvalidConfiguration,
            format!("provider kind '{other}' is not wired for document generation"),
        )),
    }
}
