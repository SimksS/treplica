use chrono::Utc;
use local_store::models::AuditLogEntry;
use local_store::repositories::StoreRepositories;
use serde_json::{json, Value};
use uuid::Uuid;

const SECRET_KEYS: &[&str] = &[
    "api_key",
    "apikey",
    "token",
    "secret",
    "password",
    "credential",
    "authorization",
    "bearer",
    "x-api-key",
    "x_auth",
];

pub fn scrub_value(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut out = serde_json::Map::new();
            for (k, v) in map {
                if SECRET_KEYS.iter().any(|s| k.to_lowercase().contains(s)) {
                    out.insert(k.clone(), Value::String("***REDACTED***".into()));
                } else {
                    out.insert(k.clone(), scrub_value(v));
                }
            }
            Value::Object(out)
        }
        Value::Array(items) => Value::Array(items.iter().map(scrub_value).collect()),
        _ => value.clone(),
    }
}

#[allow(dead_code)]
pub fn scrub_json_str(raw: &str) -> String {
    let parsed: Value = serde_json::from_str(raw).unwrap_or_else(|_| json!({ "raw": raw }));
    scrub_value(&parsed).to_string()
}

pub fn write_audit(
    repo: &StoreRepositories<'_>,
    session_id: Option<&str>,
    category: &str,
    action: &str,
    details: Value,
    severity: &str,
) -> Result<(), String> {
    let entry = AuditLogEntry {
        id: Uuid::new_v4().to_string(),
        session_id: session_id.map(str::to_string),
        category: category.into(),
        action: action.into(),
        details_json: scrub_value(&details).to_string(),
        severity: severity.into(),
        created_at: Utc::now(),
    };
    repo.insert_audit(&entry).map_err(|e| e.to_string())
}

pub fn audit_translation_generated(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    translation_id: &str,
    content_left_device: bool,
    confidence: f32,
) -> Result<(), String> {
    let local_or_hosted = if content_left_device {
        "hosted"
    } else {
        "local"
    };
    write_audit(
        repo,
        Some(session_id),
        "provider",
        "translation_generated",
        json!({
            "translation_id": translation_id,
            "local_or_hosted": local_or_hosted,
            "confidence": confidence,
        }),
        "info",
    )
}

pub fn audit_translation_low_confidence(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    translation_id: &str,
    confidence: f32,
) -> Result<(), String> {
    write_audit(
        repo,
        Some(session_id),
        "provider",
        "translation_low_confidence",
        json!({
            "translation_id": translation_id,
            "confidence": confidence,
        }),
        "warning",
    )
}

pub fn audit_guidance_generated(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    suggestion_id: &str,
    suggestion_type: provider_core::SuggestionType,
    confidence: f32,
    local_or_hosted: &str,
) -> Result<(), String> {
    write_audit(
        repo,
        Some(session_id),
        "provider",
        "guidance_generated",
        json!({
            "suggestion_id": suggestion_id,
            "suggestion_type": format!("{:?}", suggestion_type),
            "confidence": confidence,
            "local_or_hosted": local_or_hosted,
        }),
        "info",
    )
}

pub fn audit_objection_handled(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    suggestion_id: &str,
    confidence: f32,
) -> Result<(), String> {
    write_audit(
        repo,
        Some(session_id),
        "guidance",
        "objection_handled",
        json!({
            "suggestion_id": suggestion_id,
            "confidence": confidence,
        }),
        "info",
    )
}

pub fn audit_follow_up_suggested(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    suggestion_id: &str,
    suggestion_type: provider_core::SuggestionType,
    confidence: f32,
) -> Result<(), String> {
    write_audit(
        repo,
        Some(session_id),
        "guidance",
        "follow_up_suggested",
        json!({
            "suggestion_id": suggestion_id,
            "suggestion_type": format!("{:?}", suggestion_type),
            "confidence": confidence,
        }),
        "info",
    )
}

pub fn audit_document_generated(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    document_id: &str,
    doc_type: &str,
    content_left_device: bool,
) -> Result<(), String> {
    write_audit(
        repo,
        Some(session_id),
        "document",
        "document_generated",
        json!({
            "document_id": document_id,
            "doc_type": doc_type,
            "local_or_hosted": if content_left_device { "hosted" } else { "local" },
        }),
        "info",
    )
}

pub fn audit_session_deleted(repo: &StoreRepositories<'_>, session_id: &str) -> Result<(), String> {
    write_audit(
        repo,
        None,
        "deletion",
        "session_deleted",
        json!({ "session_id": session_id }),
        "info",
    )
}

pub fn audit_hosted_provider_call(
    repo: &StoreRepositories<'_>,
    session_id: &str,
    provider_id: &str,
    purpose: &str,
    latency_ms: u64,
) -> Result<(), String> {
    write_audit(
        repo,
        Some(session_id),
        "provider",
        "hosted_request_sent",
        json!({
            "provider_id": provider_id,
            "purpose": purpose,
            "local_or_hosted": "hosted",
            "latency_ms": latency_ms,
        }),
        "info",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrubs_api_keys_from_details() {
        let raw = json!({
            "provider_id": "openai",
            "api_key": "sk-secret-key-12345",
            "nested": { "token": "abc" }
        });
        let scrubbed = scrub_value(&raw);
        assert_eq!(scrubbed["api_key"], "***REDACTED***");
        assert_eq!(scrubbed["nested"]["token"], "***REDACTED***");
        assert_eq!(scrubbed["provider_id"], "openai");
    }
}
