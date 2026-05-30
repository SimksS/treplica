use local_store::database::open_in_memory;
use local_store::models::TranscriptSegment;
use local_store::repositories::StoreRepositories;
use local_store::translation_repository::TranslationRepository;
use uuid::Uuid;
use chrono::Utc;

#[test]
fn transcript_to_translation_persistence() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    let translations = TranslationRepository::new(&conn);

    let session = repo.create_session("Translation test").expect("session");
    translations
        .set_session_target_language(&session.id, Some("en"))
        .expect("target");

    let transcript = TranscriptSegment {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        speaker_label: Some("Guest".into()),
        started_at_ms: 0,
        ended_at_ms: 1000,
        language: "pt-BR".into(),
        text: "Bom dia a todos".into(),
        confidence: 0.9,
        is_uncertain: false,
        source: "simulated".into(),
        created_at: Utc::now(),
    };
    repo.insert_transcript(&transcript).expect("transcript");

    let translation = local_store::models::TranslationSegment {
        id: Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        transcript_segment_id: transcript.id.clone(),
        source_language: "pt-BR".into(),
        target_language: "en".into(),
        text: "[EN] Bom dia a todos".into(),
        confidence: 0.88,
        is_uncertain: false,
        provider_id: Some("ollama-local".into()),
        created_at: Utc::now(),
    };
    translations.insert(&translation).expect("insert");

    let list = translations.list_for_session(&session.id).expect("list");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].transcript_segment_id, transcript.id);
    assert_eq!(list[0].target_language, "en");
}
