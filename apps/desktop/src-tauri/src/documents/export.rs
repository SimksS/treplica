use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;
use local_store::models::GeneratedDocument;

#[derive(Debug, Clone)]
pub struct ExportResult {
    pub path: PathBuf,
    pub format: String,
    pub exported_at: String,
}

pub fn write_document_export(
    exports_root: &Path,
    doc: &GeneratedDocument,
) -> Result<ExportResult, String> {
    let session_dir = exports_root.join(&doc.session_id);
    fs::create_dir_all(&session_dir).map_err(|e| e.to_string())?;
    let filename = format!(
        "{}-{}.md",
        doc_type_slug(doc.doc_type),
        doc.id.chars().take(8).collect::<String>()
    );
    let path = session_dir.join(filename);
    let provenance = format!(
        "---\ntitle: {}\nsession_id: {}\ndoc_type: {}\nexported_at: {}\n---\n\n",
        doc.title,
        doc.session_id,
        doc_type_slug(doc.doc_type),
        Utc::now().to_rfc3339(),
    );
    let body = format!("{provenance}{}", doc.content);
    fs::write(&path, body).map_err(|e| e.to_string())?;
    Ok(ExportResult {
        path: path.clone(),
        format: doc.format.clone(),
        exported_at: Utc::now().to_rfc3339(),
    })
}

pub fn remove_path_if_exists(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.exists() {
        if p.is_dir() {
            fs::remove_dir_all(p).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(p).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn remove_session_export_dir(exports_root: &Path, session_id: &str) -> Result<(), String> {
    let dir = exports_root.join(session_id);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn doc_type_slug(doc_type: local_store::models::DocumentType) -> &'static str {
    match doc_type {
        local_store::models::DocumentType::Summary => "summary",
        local_store::models::DocumentType::FollowUpEmail => "follow-up",
        local_store::models::DocumentType::TranscriptExport => "transcript",
        local_store::models::DocumentType::ObjectionAnalysis => "objections",
        local_store::models::DocumentType::Notes => "notes",
        local_store::models::DocumentType::Custom => "custom",
    }
}
