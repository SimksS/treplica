use chrono::Utc;
use local_store::database::open_in_memory;
use local_store::models::{GuidanceSuggestion, SessionStatus, SuggestionType, TranscriptSegment};
use local_store::repositories::StoreRepositories;
use uuid::Uuid;

#[test]
fn migration_creates_tables() {
    let conn = open_in_memory().expect("in-memory db");
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sessions'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn session_crud_and_transcript() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    repo.ensure_default_profile().expect("profile");

    let session = repo.create_session("Test meeting").expect("session");
    assert_eq!(session.status, SessionStatus::Draft);

    let listening = repo
        .update_session_status(
            &session.id,
            SessionStatus::Listening,
            Some(Utc::now()),
            None,
        )
        .expect("listening");
    assert_eq!(listening.status, SessionStatus::Listening);

    let segment = TranscriptSegment {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        speaker_label: Some("Guest".into()),
        started_at_ms: 0,
        ended_at_ms: 1200,
        language: "pt-BR".into(),
        text: "Qual o ROI esperado?".into(),
        confidence: 0.92,
        is_uncertain: false,
        source: "simulated".into(),
        created_at: Utc::now(),
    };
    repo.insert_transcript(&segment).expect("insert");

    let list = repo.list_transcripts(&session.id).expect("list");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].text, "Qual o ROI esperado?");
    assert_eq!(repo.count_transcripts(&session.id).unwrap(), 1);

    for i in 0..4 {
        let extra = TranscriptSegment {
            id: Uuid::new_v4().to_string(),
            session_id: session.id.clone(),
            speaker_label: None,
            started_at_ms: (i + 2) * 1000,
            ended_at_ms: (i + 3) * 1000,
            language: "pt-BR".into(),
            text: format!("trecho {i}"),
            confidence: 0.9,
            is_uncertain: false,
            source: "simulated".into(),
            created_at: Utc::now(),
        };
        repo.insert_transcript(&extra).expect("insert extra");
    }

    let recent = repo
        .list_transcripts_recent(&session.id, 3)
        .expect("recent");
    assert_eq!(recent.len(), 3);
    assert_eq!(recent[0].text, "trecho 1");
    assert_eq!(recent[2].text, "trecho 3");
    assert_eq!(repo.count_transcripts(&session.id).unwrap(), 5);
}

#[test]
fn guidance_and_audit_persist() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    let session = repo.create_session("Audit test").expect("session");

    let suggestion = GuidanceSuggestion {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        trigger_segment_ids: vec![],
        suggestion_type: SuggestionType::Answer,
        text: "Destaque o valor de longo prazo.".into(),
        rationale: Some("ROI objection".into()),
        confidence: 0.8,
        provider_id: Some("local-sim".into()),
        shown_at: Some(Utc::now()),
        copied_at: None,
        saved: false,
        created_at: Utc::now(),
    };
    repo.insert_suggestion(&suggestion).expect("suggestion");

    let entry = local_store::models::AuditLogEntry {
        id: Uuid::new_v4().to_string(),
        session_id: Some(session.id.clone()),
        category: "session".into(),
        action: "started".into(),
        details_json: "{}".into(),
        severity: "info".into(),
        created_at: Utc::now(),
    };
    repo.insert_audit(&entry).expect("audit");

    assert_eq!(repo.list_suggestions(&session.id).unwrap().len(), 1);
    assert_eq!(repo.list_audit_for_session(&session.id).unwrap().len(), 1);
}
