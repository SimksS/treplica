use chrono::Utc;
use local_store::database::open_in_memory;
use local_store::models::{AuditLogEntry, SessionStatus};
use local_store::repositories::StoreRepositories;
use uuid::Uuid;

fn audit(repo: &StoreRepositories<'_>, session_id: &str, action: &str) {
    let entry = AuditLogEntry {
        id: Uuid::new_v4().to_string(),
        session_id: Some(session_id.to_string()),
        category: "session".into(),
        action: action.into(),
        details_json: "{}".into(),
        severity: "info".into(),
        created_at: Utc::now(),
    };
    repo.insert_audit(&entry).expect("audit");
}

#[test]
fn session_lifecycle_with_audit_events() {
    let conn = open_in_memory().expect("db");
    let repo = StoreRepositories::new(&conn);

    let session = repo.create_session("Lifecycle").expect("create");
    assert_eq!(session.status, SessionStatus::Draft);
    audit(&repo, &session.id, "created");

    let listening = repo
        .update_session_status(
            &session.id,
            SessionStatus::Listening,
            Some(Utc::now()),
            None,
        )
        .expect("start");
    assert_eq!(listening.status, SessionStatus::Listening);
    audit(&repo, &session.id, "started");

    let paused = repo
        .update_session_status(&session.id, SessionStatus::Paused, None, None)
        .expect("pause");
    assert_eq!(paused.status, SessionStatus::Paused);
    audit(&repo, &session.id, "paused");

    let resumed = repo
        .update_session_status(&session.id, SessionStatus::Listening, None, None)
        .expect("resume");
    assert_eq!(resumed.status, SessionStatus::Listening);
    audit(&repo, &session.id, "resumed");

    let ended = repo
        .update_session_status(&session.id, SessionStatus::Ended, None, Some(Utc::now()))
        .expect("end");
    assert_eq!(ended.status, SessionStatus::Ended);
    audit(&repo, &session.id, "ended");

    let audits = repo.list_audit_for_session(&session.id).expect("audits");
    assert!(audits.len() >= 5);
    let actions: Vec<_> = audits.iter().map(|a| a.action.as_str()).collect();
    assert!(actions.contains(&"started"));
    assert!(actions.contains(&"ended"));
}
