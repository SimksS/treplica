use chrono::Utc;
use local_store::database::open_in_memory;
use local_store::models::ProviderCallRecord;
use local_store::repositories::StoreRepositories;
use uuid::Uuid;

#[test]
fn provider_call_records_hosted_metadata_without_credentials() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);
    let session = repo.create_session("Hosted audit").expect("session");

    let call = ProviderCallRecord {
        id: Uuid::new_v4().to_string(),
        session_id: Some(session.id.clone()),
        provider_id: Some("openai".into()),
        purpose: "guidance".into(),
        local_or_hosted: "hosted".into(),
        request_started_at: Utc::now(),
        request_finished_at: Some(Utc::now()),
        status: "success".into(),
        latency_ms: Some(120),
        error_code: None,
    };
    repo.insert_provider_call(&call).expect("call");

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM provider_calls WHERE local_or_hosted = 'hosted' AND session_id = ?1",
            [&session.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);

    let has_secret: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM provider_calls WHERE error_code LIKE '%sk-%'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(has_secret, 0);
}
