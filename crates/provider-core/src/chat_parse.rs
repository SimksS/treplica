use crate::{ProviderError, ProviderErrorCode, ProviderResult};

pub fn normalize_model_key(name: &str) -> String {
    name.chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>()
        .to_lowercase()
}

pub fn is_model_echo(text: &str, model: &str) -> bool {
    let t = normalize_model_key(text);
    let m = normalize_model_key(model);
    !t.is_empty() && (t == m || t == format!("{m}:latest") || m.starts_with(&format!("{t}:")))
}

pub fn parse_openai_completions_body(body: &str, requested_model: &str) -> ProviderResult<String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            "empty response body from chat API",
        ));
    }

    let value: serde_json::Value = serde_json::from_str(trimmed).map_err(|e| {
        ProviderError::structured(
            ProviderErrorCode::Unknown,
            format!("invalid chat API JSON: {e}"),
        )
    })?;

    if let Some(err) = value.get("error") {
        let msg = err
            .get("message")
            .and_then(|m| m.as_str())
            .or_else(|| err.as_str())
            .unwrap_or("unknown API error");
        return Err(ProviderError::structured(
            ProviderErrorCode::ProviderUnavailable,
            msg.to_string(),
        ));
    }

    let content = value
        .pointer("/choices/0/message/content")
        .or_else(|| value.pointer("/choices/0/text"))
        .and_then(|v| match v {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Array(parts) => {
                let joined: String = parts
                    .iter()
                    .filter_map(|p| p.get("text").and_then(|t| t.as_str()))
                    .collect();
                if joined.is_empty() { None } else { Some(joined) }
            }
            _ => None,
        });

    let text = content.unwrap_or_default().trim().to_string();
    if text.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            "chat API returned empty assistant content",
        ));
    }

    if is_model_echo(&text, requested_model) {
        return Err(ProviderError::structured(
            ProviderErrorCode::Unknown,
            format!(
                "API echoed model name '{text}' instead of an answer; verify model id and endpoint"
            ),
        ));
    }

    Ok(text)
}
