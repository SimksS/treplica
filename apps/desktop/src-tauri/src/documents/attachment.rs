use base64::Engine;
use std::fs;
use std::path::Path;

const MAX_PAGES: usize = 8;
const MAX_PAGE_BYTES: usize = 2 * 1024 * 1024;

/// Saves base64 page images (data URLs or raw base64) under `{data_root}/context_attachments/{session_id}/`.
/// Returns relative paths stored in the database.
pub fn save_pre_meeting_pages(
    data_root: &Path,
    session_id: &str,
    pages_base64: &[String],
) -> Result<Vec<String>, String> {
    if pages_base64.is_empty() {
        return Ok(vec![]);
    }
    if pages_base64.len() > MAX_PAGES {
        return Err(format!("Máximo de {MAX_PAGES} páginas por anexo."));
    }

    let dir = data_root
        .join("context_attachments")
        .join(session_id);
    fs::create_dir_all(&dir).map_err(|e| format!("Falha ao criar pasta de anexo: {e}"))?;

    let mut stored = Vec::new();
    for (index, payload) in pages_base64.iter().enumerate().take(MAX_PAGES) {
        let (bytes, ext) = decode_page_payload(payload)?;
        if bytes.len() > MAX_PAGE_BYTES {
            return Err(format!(
                "Página {} excede o limite de {} MB.",
                index + 1,
                MAX_PAGE_BYTES / (1024 * 1024)
            ));
        }
        let filename = format!("page-{:02}.{ext}", index + 1);
        let abs = dir.join(&filename);
        fs::write(&abs, &bytes).map_err(|e| format!("Falha ao gravar página do anexo: {e}"))?;
        stored.push(
            Path::new("context_attachments")
                .join(session_id)
                .join(&filename)
                .to_string_lossy()
                .replace('\\', "/"),
        );
    }
    Ok(stored)
}

pub fn load_pages_as_data_urls(data_root: &Path, relative_paths: &[String]) -> Result<Vec<String>, String> {
    let mut urls = Vec::new();
    for rel in relative_paths {
        let abs = data_root.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        let bytes = fs::read(&abs).map_err(|e| format!("Falha ao ler anexo {rel}: {e}"))?;
        let mime = mime_from_path(&abs);
        let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
        urls.push(format!("data:{mime};base64,{b64}"));
    }
    Ok(urls)
}

pub fn clear_session_attachments(data_root: &Path, session_id: &str) {
    let dir = data_root.join("context_attachments").join(session_id);
    if dir.is_dir() {
        let _ = fs::remove_dir_all(dir);
    }
}

fn decode_page_payload(payload: &str) -> Result<(Vec<u8>, &'static str), String> {
    let trimmed = payload.trim();
    if let Some(rest) = trimmed.strip_prefix("data:") {
        let (meta, data) = rest.split_once(',').ok_or_else(|| {
            "Data URL do anexo inválida.".to_string()
        })?;
        let mime = meta.split(';').next().unwrap_or("image/jpeg");
        let ext = ext_from_mime(mime);
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(data.trim())
            .map_err(|e| format!("Base64 do anexo inválido: {e}"))?;
        return Ok((bytes, ext));
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(trimmed)
        .map_err(|e| format!("Base64 do anexo inválido: {e}"))?;
    Ok((bytes, "jpg"))
}

fn ext_from_mime(mime: &str) -> &'static str {
    match mime.to_ascii_lowercase().as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    }
}

fn mime_from_path(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/jpeg",
    }
}

pub fn pages_json(paths: &[String]) -> Option<String> {
    if paths.is_empty() {
        None
    } else {
        serde_json::to_string(paths).ok()
    }
}

pub fn parse_pages_json(raw: &Option<String>) -> Vec<String> {
    raw.as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_page_paths() {
        let tmp = tempfile::tempdir().unwrap();
        let pages = vec!["data:image/png;base64,iVBORw0KGgo=".to_string()];
        let stored = save_pre_meeting_pages(tmp.path(), "sess-1", &pages).unwrap();
        assert_eq!(stored.len(), 1);
        let urls = load_pages_as_data_urls(tmp.path(), &stored).unwrap();
        assert!(urls[0].starts_with("data:image/png;base64,"));
    }
}
