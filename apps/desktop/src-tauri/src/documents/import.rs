use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;
use local_store::history_repository::{parse_document_type, HistoryRepository};
use local_store::models::{DocumentType, GeneratedDocument};
use local_store::repositories::StoreRepositories;
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Debug, Clone)]
pub struct ParsedExportFile {
    pub session_id: String,
    pub doc_type: DocumentType,
    pub title: String,
    pub content: String,
    pub path: PathBuf,
}

#[derive(Debug, Clone, Default)]
pub struct ImportDocumentsResult {
    pub imported: u32,
    pub skipped: u32,
    pub sessions_created: u32,
    pub errors: Vec<String>,
}

pub fn scan_export_directory(root: &Path) -> Result<Vec<ParsedExportFile>, String> {
    if !root.exists() {
        return Err("A pasta selecionada não existe.".into());
    }
    if !root.is_dir() {
        return Err("O caminho informado não é uma pasta.".into());
    }

    let mut files = Vec::new();
    let mut errors = Vec::new();

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        match parse_export_markdown(path) {
            Ok(parsed) => files.push(parsed),
            Err(e) => errors.push(format!("{}: {e}", path.display())),
        }
    }

    if files.is_empty() && !errors.is_empty() {
        return Err(errors.join("\n"));
    }

    Ok(files)
}

pub fn import_documents_from_directory(
    repo: &StoreRepositories<'_>,
    root: &Path,
) -> Result<ImportDocumentsResult, String> {
    let parsed_files = scan_export_directory(root)?;
    let history = HistoryRepository::new(repo.conn());
    let mut result = ImportDocumentsResult {
        imported: 0,
        skipped: parsed_files.len() as u32,
        ..Default::default()
    };
    result.skipped = 0;

    for file in parsed_files {
        let path_str = file.path.to_string_lossy().to_string();
        match history.document_with_storage_path_exists(&path_str) {
            Ok(true) => {
                result.skipped += 1;
                continue;
            }
            Ok(false) => {}
            Err(e) => {
                result.errors.push(format!("{path_str}: {e}"));
                continue;
            }
        }

        match history.ensure_import_session(&file.session_id, &file.title) {
            Ok(created) => {
                if created {
                    result.sessions_created += 1;
                }
            }
            Err(e) => {
                result.errors.push(format!("{path_str}: {e}"));
                continue;
            }
        }

        let now = Utc::now();
        let doc = GeneratedDocument {
            id: Uuid::new_v4().to_string(),
            session_id: file.session_id.clone(),
            doc_type: file.doc_type,
            title: file.title.clone(),
            content: file.content.clone(),
            format: "markdown".into(),
            storage_path: Some(path_str.clone()),
            provider_id: None,
            created_at: now,
            updated_at: now,
        };

        if let Err(e) = history.insert_document(&doc) {
            result.errors.push(format!("{path_str}: {e}"));
            continue;
        }
        result.imported += 1;
    }

    Ok(result)
}

pub fn parse_export_markdown(path: &Path) -> Result<ParsedExportFile, String> {
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let (meta, content) = split_front_matter(&raw)?;

    let session_id = meta
        .get("session_id")
        .cloned()
        .or_else(|| infer_session_id_from_path(path))
        .ok_or_else(|| "session_id ausente no arquivo e na estrutura de pastas".to_string())?;

    let title = meta
        .get("title")
        .cloned()
        .unwrap_or_else(|| path.file_stem().and_then(|s| s.to_str()).unwrap_or("Documento").to_string());

    let doc_type = meta
        .get("doc_type")
        .map(|s| doc_type_from_slug(s))
        .unwrap_or(DocumentType::Custom);

    let content = content.trim();
    if content.is_empty() {
        return Err("conteúdo vazio".into());
    }

    Ok(ParsedExportFile {
        session_id,
        doc_type,
        title,
        content: content.to_string(),
        path: path.to_path_buf(),
    })
}

fn split_front_matter(raw: &str) -> Result<(std::collections::HashMap<String, String>, String), String> {
    let trimmed = raw.trim_start();
    if !trimmed.starts_with("---") {
        return Err("front matter YAML ausente".into());
    }
    let without_open = trimmed.trim_start_matches('-').trim_start();
    let end = without_open
        .find("\n---")
        .ok_or_else(|| "front matter YAML incompleto".to_string())?;
    let header = &without_open[..end];
    let body = without_open[end + 4..].trim_start();
    let mut map = std::collections::HashMap::new();
    for line in header.lines() {
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        map.insert(key.trim().to_string(), value.trim().to_string());
    }
    Ok((map, body.to_string()))
}

fn infer_session_id_from_path(path: &Path) -> Option<String> {
    path.parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .filter(|s| s.len() >= 8)
        .map(|s| s.to_string())
}

fn doc_type_from_slug(slug: &str) -> DocumentType {
    match slug {
        "summary" => DocumentType::Summary,
        "follow-up" | "follow_up" | "follow_up_email" => DocumentType::FollowUpEmail,
        "transcript" | "transcript_export" => DocumentType::TranscriptExport,
        "objections" | "objection_analysis" => DocumentType::ObjectionAnalysis,
        "notes" => DocumentType::Notes,
        "custom" => DocumentType::Custom,
        other => parse_document_type(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_treplica_export_front_matter() {
        let raw = "---\ntitle: Resumo\nsession_id: abc-123\ndoc_type: summary\n---\n\nCorpo do doc";
        let (meta, body) = split_front_matter(raw).expect("parse");
        assert_eq!(meta.get("session_id").map(String::as_str), Some("abc-123"));
        assert_eq!(body, "Corpo do doc");
    }
}
