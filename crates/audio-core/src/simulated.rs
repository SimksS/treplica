use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

use crate::{AudioResult, TranscriptEvent, TranscriptSource};

const SAMPLE_LINES: &[&str] = &[
    "Bom dia, podemos começar pela agenda?",
    "Qual o ROI esperado para este trimestre?",
    "Temos uma objeção sobre o preço proposto.",
    "Pode detalhar como funciona a implementação?",
    "Precisamos de mais clareza sobre o prazo de entrega.",
];

pub struct SimulatedTranscriptSource {
    index: usize,
}

impl SimulatedTranscriptSource {
    pub fn new() -> Self {
        Self { index: 0 }
    }

    pub fn next_segment_sync(&mut self) -> AudioResult<Option<TranscriptEvent>> {
        let text = SAMPLE_LINES[self.index % SAMPLE_LINES.len()].to_string();
        self.index += 1;
        let now = Utc::now();
        let ms = (self.index as i64) * 3000;
        Ok(Some(TranscriptEvent {
            segment_id: Uuid::new_v4(),
            speaker_label: Some(if self.index.is_multiple_of(2) {
                "Participante".into()
            } else {
                "Você".into()
            }),
            text,
            confidence: 0.88,
            is_uncertain: false,
            language: "pt-BR".into(),
            started_at_ms: ms - 3000,
            ended_at_ms: ms,
            emitted_at: now,
        }))
    }
}

impl Default for SimulatedTranscriptSource {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl TranscriptSource for SimulatedTranscriptSource {
    async fn next_segment(&mut self) -> AudioResult<Option<TranscriptEvent>> {
        let text = SAMPLE_LINES[self.index % SAMPLE_LINES.len()].to_string();
        self.index += 1;
        let now = Utc::now();
        let ms = (self.index as i64) * 3000;
        Ok(Some(TranscriptEvent {
            segment_id: Uuid::new_v4(),
            speaker_label: Some(if self.index.is_multiple_of(2) {
                "Participante".into()
            } else {
                "Você".into()
            }),
            text,
            confidence: 0.88,
            is_uncertain: false,
            language: "pt-BR".into(),
            started_at_ms: ms - 3000,
            ended_at_ms: ms,
            emitted_at: now,
        }))
    }

    fn is_simulated(&self) -> bool {
        true
    }
}
