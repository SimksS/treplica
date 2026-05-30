pub mod simulated;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptEvent {
    pub segment_id: Uuid,
    pub speaker_label: Option<String>,
    pub text: String,
    pub confidence: f32,
    pub is_uncertain: bool,
    pub language: String,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub emitted_at: DateTime<Utc>,
}

#[derive(Debug, Error)]
pub enum AudioError {
    #[error("capture unavailable: {0}")]
    CaptureUnavailable(String),
    #[error("simulation ended")]
    SimulationEnded,
}

pub type AudioResult<T> = Result<T, AudioError>;

#[async_trait]
pub trait TranscriptSource: Send + Sync {
    async fn next_segment(&mut self) -> AudioResult<Option<TranscriptEvent>>;
    fn is_simulated(&self) -> bool;
}

#[async_trait]
pub trait AudioCapture: Send + Sync {
    async fn start(&mut self) -> AudioResult<()>;
    async fn stop(&mut self) -> AudioResult<()>;
    fn transcript_source(&mut self) -> Box<dyn TranscriptSource>;
}
