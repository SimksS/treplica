use serde::{Deserialize, Serialize};

/// Tasks that can be routed to different provider configurations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelTask {
    Transcription,
    Guidance,
    Translation,
    Vision,
    Search,
    Summarization,
}

impl ModelTask {
    pub fn label(self) -> &'static str {
        match self {
            Self::Transcription => "Transcrição de chamadas",
            Self::Guidance => "Orientação ao vivo",
            Self::Translation => "Tradução",
            Self::Vision => "Reconhecimento de imagem",
            Self::Search => "Busca de informações",
            Self::Summarization => "Resumos e documentos",
        }
    }

    pub fn capability(self) -> crate::ProviderCapability {
        match self {
            Self::Transcription => crate::ProviderCapability::Transcription,
            Self::Guidance => crate::ProviderCapability::Chat,
            Self::Translation => crate::ProviderCapability::Translation,
            Self::Vision => crate::ProviderCapability::Vision,
            Self::Search => crate::ProviderCapability::Search,
            Self::Summarization => crate::ProviderCapability::Summarization,
        }
    }

    pub fn all() -> &'static [ModelTask] {
        &[
            ModelTask::Transcription,
            ModelTask::Guidance,
            ModelTask::Translation,
            ModelTask::Vision,
            ModelTask::Search,
            ModelTask::Summarization,
        ]
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModelRoutingConfig {
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

impl ModelRoutingConfig {
    pub fn provider_for(&self, task: ModelTask) -> Option<&str> {
        match task {
            ModelTask::Transcription => self.transcription_provider_id.as_deref(),
            ModelTask::Guidance => self.guidance_provider_id.as_deref(),
            ModelTask::Translation => self.translation_provider_id.as_deref(),
            ModelTask::Vision => self.vision_provider_id.as_deref(),
            ModelTask::Search => self.search_provider_id.as_deref(),
            ModelTask::Summarization => self.summarization_provider_id.as_deref(),
        }
    }

    pub fn model_for(&self, task: ModelTask) -> Option<&str> {
        match task {
            ModelTask::Transcription => self.transcription_model.as_deref(),
            ModelTask::Guidance => self.guidance_model.as_deref(),
            ModelTask::Translation => self.translation_model.as_deref(),
            ModelTask::Vision => self.vision_model.as_deref(),
            ModelTask::Search => self.search_model.as_deref(),
            ModelTask::Summarization => self.summarization_model.as_deref(),
        }
    }

    pub fn set_provider(&mut self, task: ModelTask, provider_id: Option<String>) {
        match task {
            ModelTask::Transcription => self.transcription_provider_id = provider_id,
            ModelTask::Guidance => self.guidance_provider_id = provider_id,
            ModelTask::Translation => self.translation_provider_id = provider_id,
            ModelTask::Vision => self.vision_provider_id = provider_id,
            ModelTask::Search => self.search_provider_id = provider_id,
            ModelTask::Summarization => self.summarization_provider_id = provider_id,
        }
    }

    pub fn set_model(&mut self, task: ModelTask, model: Option<String>) {
        let normalized = model
            .map(|m| m.trim().to_string())
            .filter(|m| !m.is_empty());
        match task {
            ModelTask::Transcription => self.transcription_model = normalized,
            ModelTask::Guidance => self.guidance_model = normalized,
            ModelTask::Translation => self.translation_model = normalized,
            ModelTask::Vision => self.vision_model = normalized,
            ModelTask::Search => self.search_model = normalized,
            ModelTask::Summarization => self.summarization_model = normalized,
        }
    }

    /// Clears provider and model slots that referenced a deleted provider.
    pub fn clear_provider_references(&mut self, provider_id: &str) {
        for task in ModelTask::all() {
            if self.provider_for(*task) == Some(provider_id) {
                self.set_provider(*task, None);
                self.set_model(*task, None);
            }
        }
    }
}
