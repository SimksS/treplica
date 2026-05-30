use chrono::Utc;
use local_store::models::TranscriptSegment;
use local_store::repositories::StoreRepositories;

use audio_core::simulated::SimulatedTranscriptSource;

pub struct TranscriptionService;

impl TranscriptionService {
    pub fn ingest_simulated_tick(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        source: &mut SimulatedTranscriptSource,
    ) -> Result<TranscriptSegment, String> {
        let event = match source.next_segment_sync() {
            Ok(Some(e)) => e,
            Ok(None) => return Err("no segment available".into()),
            Err(audio_core::AudioError::SimulationEnded) => return Err("simulation ended".into()),
            Err(e) => return Err(e.to_string()),
        };

        let segment = TranscriptSegment {
            id: event.segment_id.to_string(),
            session_id: session_id.to_string(),
            speaker_label: event.speaker_label,
            started_at_ms: event.started_at_ms,
            ended_at_ms: event.ended_at_ms,
            language: event.language,
            text: event.text,
            confidence: event.confidence,
            is_uncertain: event.is_uncertain,
            source: "simulated".into(),
            created_at: Utc::now(),
        };
        repo.insert_transcript(&segment)
            .map_err(|e| e.to_string())?;
        Ok(segment)
    }

    pub fn ingest_live(
        repo: &StoreRepositories<'_>,
        session_id: &str,
        text: &str,
        speaker_label: Option<String>,
        language: &str,
    ) -> Result<TranscriptSegment, String> {
        let segment = TranscriptSegment {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            speaker_label,
            started_at_ms: 0,
            ended_at_ms: 0,
            language: language.to_string(),
            text: text.trim().to_string(),
            confidence: 0.92,
            is_uncertain: false,
            source: "web_speech".into(),
            created_at: Utc::now(),
        };
        if segment.text.is_empty() {
            return Err("transcript text is empty".into());
        }
        repo.insert_transcript(&segment)
            .map_err(|e| e.to_string())?;
        Ok(segment)
    }
}
