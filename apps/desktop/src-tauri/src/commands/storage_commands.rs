use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::CommandResponse;
use crate::documents::import::{import_documents_from_directory, ImportDocumentsResult};
use crate::storage::AppState;

#[derive(Debug, Serialize)]
pub struct DocumentsStorageSettingsDto {
    pub custom_export_dir: Option<String>,
    pub default_export_dir: String,
    pub effective_export_dir: String,
}

#[derive(Debug, Deserialize)]
pub struct SetDocumentsExportDirInput {
    pub path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ImportDocumentsResultDto {
    pub imported: u32,
    pub skipped: u32,
    pub sessions_created: u32,
    pub errors: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportDocumentsInput {
    pub directory: Option<String>,
}

fn validate_export_directory(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Informe uma pasta válida.".into());
    }
    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err("Use um caminho absoluto (ex.: D:\\Treplica\\exports).".into());
    }
    std::fs::create_dir_all(&path).map_err(|e| format!("Não foi possível criar a pasta: {e}"))?;
    Ok(path)
}

fn map_import_result(result: ImportDocumentsResult) -> ImportDocumentsResultDto {
    ImportDocumentsResultDto {
        imported: result.imported,
        skipped: result.skipped,
        sessions_created: result.sessions_created,
        errors: result.errors,
    }
}

#[tauri::command]
pub fn get_documents_storage_settings(
    state: State<'_, AppState>,
) -> Result<CommandResponse<DocumentsStorageSettingsDto>, ()> {
    match build_settings_dto(&state) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("storage_error", e)),
    }
}

#[tauri::command]
pub fn set_documents_export_directory(
    state: State<'_, AppState>,
    input: SetDocumentsExportDirInput,
) -> Result<CommandResponse<DocumentsStorageSettingsDto>, ()> {
    let custom = match input.path {
        Some(ref path) if !path.trim().is_empty() => {
            if let Err(e) = validate_export_directory(path) {
                return Ok(CommandResponse::failure("storage_error", e));
            }
            Some(path.trim().to_string())
        }
        _ => None,
    };

    if let Err(e) = state.app_settings.update(|settings| {
        settings.documents_export_dir = custom;
    }) {
        return Ok(CommandResponse::failure("storage_error", e));
    }

    match build_settings_dto(&state) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("storage_error", e)),
    }
}

#[tauri::command]
pub fn pick_documents_export_directory() -> Result<CommandResponse<Option<String>>, ()> {
    let picked = rfd::FileDialog::new()
        .set_title("Escolher pasta para documentos exportados")
        .pick_folder();
    Ok(CommandResponse::success(
        picked.map(|p| p.to_string_lossy().to_string()),
    ))
}

#[tauri::command]
pub fn pick_documents_import_directory() -> Result<CommandResponse<Option<String>>, ()> {
    let picked = rfd::FileDialog::new()
        .set_title("Escolher pasta para importar documentos")
        .pick_folder();
    Ok(CommandResponse::success(
        picked.map(|p| p.to_string_lossy().to_string()),
    ))
}

#[tauri::command]
pub fn open_documents_export_directory(
    state: State<'_, AppState>,
) -> Result<CommandResponse<()>, ()> {
    let path = match state.exports_root() {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("storage_error", e)),
    };
    if let Err(e) = reveal_in_file_manager(&path) {
        return Ok(CommandResponse::failure("storage_error", e));
    }
    Ok(CommandResponse::success(()))
}

#[tauri::command]
pub fn import_session_documents(
    state: State<'_, AppState>,
    input: ImportDocumentsInput,
) -> Result<CommandResponse<ImportDocumentsResultDto>, ()> {
    let directory = if let Some(ref dir) = input.directory {
        if dir.trim().is_empty() {
            return Ok(CommandResponse::failure(
                "import_error",
                "Informe a pasta de importação.",
            ));
        }
        PathBuf::from(dir.trim())
    } else {
        match state.exports_root() {
            Ok(p) => p,
            Err(e) => return Ok(CommandResponse::failure("import_error", e)),
        }
    };

    let directory = match ensure_import_within_exports(&state, &directory) {
        Ok(p) => p,
        Err(e) => return Ok(CommandResponse::failure("import_error", e)),
    };

    match state.with_repo_str(|repo| {
        import_documents_from_directory(repo, &directory).map(map_import_result)
    }) {
        Ok(dto) => Ok(CommandResponse::success(dto)),
        Err(e) => Ok(CommandResponse::failure("import_error", e)),
    }
}

fn build_settings_dto(state: &AppState) -> Result<DocumentsStorageSettingsDto, String> {
    let settings = state.app_settings.get()?;
    let default_export_dir = state.default_exports_root().to_string_lossy().to_string();
    let effective = state.exports_root()?.to_string_lossy().to_string();
    Ok(DocumentsStorageSettingsDto {
        custom_export_dir: settings
            .documents_export_dir
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string()),
        default_export_dir,
        effective_export_dir: effective,
    })
}

fn ensure_import_within_exports(state: &AppState, directory: &Path) -> Result<PathBuf, String> {
    let exports_root = state.exports_root()?;
    let exports_canonical = exports_root
        .canonicalize()
        .map_err(|e| format!("export root inválido: {e}"))?;
    let dir_canonical = directory
        .canonicalize()
        .map_err(|e| format!("pasta de importação inválida: {e}"))?;
    if !dir_canonical.starts_with(&exports_canonical) {
        return Err(
            "a importação só é permitida dentro da pasta de exportação do Treplica".into(),
        );
    }
    Ok(dir_canonical)
}

#[tauri::command]
pub fn wipe_all_data(
    state: State<'_, AppState>,
    keep_providers: bool,
) -> Result<CommandResponse<()>, ()> {
    // Collect session IDs and credential refs before deleting rows
    let session_ids: Vec<String> = match state.with_repo_str(|repo| {
        let mut stmt = repo
            .conn()
            .prepare("SELECT id FROM sessions")
            .map_err(|e| e.to_string())?;
        let ids = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        ids
    }) {
        Ok(ids) => ids,
        Err(e) => return Ok(CommandResponse::failure("wipe_error", e)),
    };

    let credential_refs: Vec<String> = if !keep_providers {
        match state.with_repo_str(|repo| {
            let mut stmt = repo
                .conn()
                .prepare(
                    "SELECT credential_ref FROM ai_provider_configurations \
                     WHERE credential_ref IS NOT NULL",
                )
                .map_err(|e| e.to_string())?;
            let refs = stmt
                .query_map([], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string());
            refs
        }) {
            Ok(refs) => refs,
            Err(e) => return Ok(CommandResponse::failure("wipe_error", e)),
        }
    } else {
        vec![]
    };

    // Delete exported documents for each session before clearing the DB
    match state.exports_root() {
        Ok(exports_root) => {
            for session_id in &session_ids {
                if let Err(e) = crate::documents::export::remove_session_export_dir(
                    &exports_root,
                    session_id,
                ) {
                    eprintln!("[wipe] failed to remove exports for {session_id}: {e}");
                }
            }
        }
        Err(e) => eprintln!("[wipe] could not resolve exports root: {e}"),
    }

    // Delete pre-meeting context attachments (stored separately from exports)
    let attachments_dir = state.data_dir.join("context_attachments");
    if attachments_dir.is_dir() {
        if let Err(e) = std::fs::remove_dir_all(&attachments_dir) {
            return Ok(CommandResponse::failure(
                "wipe_error",
                format!("failed to remove context attachments: {e}"),
            ));
        }
    }

    let sql = if keep_providers {
        "DELETE FROM sessions; \
         DELETE FROM provider_calls; \
         DELETE FROM audit_log_entries; \
         DELETE FROM deletion_requests;"
    } else {
        "DELETE FROM sessions; \
         DELETE FROM provider_calls; \
         DELETE FROM audit_log_entries; \
         DELETE FROM deletion_requests; \
         DELETE FROM ai_provider_configurations;"
    };

    if let Err(e) = state.with_repo_str(|repo| {
        repo.conn().execute_batch(sql).map_err(|e| e.to_string())
    }) {
        return Ok(CommandResponse::failure("wipe_error", e));
    }

    for cref in &credential_refs {
        let _ = state.credentials.delete(cref);
    }

    if let Err(e) = state.app_settings.update(|s| {
        s.onboarding_completed = false;
        if !keep_providers {
            s.model_routing = Default::default();
        }
    }) {
        return Ok(CommandResponse::failure(
            "wipe_error",
            format!("failed to reset app settings: {e}"),
        ));
    }

    Ok(CommandResponse::success(()))
}

fn reveal_in_file_manager(path: &std::path::Path) -> Result<(), String> {
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
