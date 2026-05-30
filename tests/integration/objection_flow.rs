use local_store::database::open_in_memory;
use local_store::models::{SessionStatus, SuggestionType, TranscriptSegment};
use local_store::repositories::StoreRepositories;
use uuid::Uuid;
use chrono::Utc;

fn detects_objection(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("obje") || lower.contains("preço") || lower.contains("preco")
}

#[test]
fn objection_trigger_detection_and_suggestion_persistence() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    let session = repo.create_session("Objection flow").expect("session");
    repo.update_session_status(&session.id, SessionStatus::Listening, Some(Utc::now()), None)
        .expect("listening");

    repo.update_session_context(
        &session.id,
        Some("Sales"),
        Some("Fechar contrato"),
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
    )
    .expect("context");

    let transcript = TranscriptSegment {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        speaker_label: Some("Prospect".into()),
        started_at_ms: 0,
        ended_at_ms: 1000,
        language: "pt-BR".into(),
        text: "Temos uma objeção sobre o preço proposto".into(),
        confidence: 0.9,
        is_uncertain: false,
        source: "simulated".into(),
        created_at: Utc::now(),
    };
    repo.insert_transcript(&transcript).expect("transcript");
    assert!(detects_objection(&transcript.text));

    let suggestion = local_store::models::GuidanceSuggestion {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        trigger_segment_ids: vec![transcript.id.clone()],
        suggestion_type: SuggestionType::ObjectionResponse,
        text: "Reconheça a objeção de preço e proponha ROI.".into(),
        rationale: Some("triggered by price objection".into()),
        confidence: 0.8,
        provider_id: Some("ollama-local".into()),
        shown_at: Some(Utc::now()),
        copied_at: None,
        saved: false,
        created_at: Utc::now(),
    };
    repo.insert_suggestion(&suggestion).expect("suggestion");

    let list = repo.list_suggestions(&session.id).expect("list");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].suggestion_type, SuggestionType::ObjectionResponse);
    assert_eq!(list[0].trigger_segment_ids[0], transcript.id);
}
