use serde::Serialize;
use tauri::State;
use tauri_plugin_updater::UpdaterExt;

use crate::commands::CommandResponse;
use crate::storage::AppState;

#[derive(Debug, Serialize)]
pub struct UpdateCheckDto {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub notes: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub async fn check_for_app_update(
    app: tauri::AppHandle,
    _state: State<'_, AppState>,
) -> Result<CommandResponse<UpdateCheckDto>, ()> {
    let current_version = app.package_info().version.to_string();
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            return Ok(CommandResponse::failure(
                "updater_unavailable",
                format!("Atualizações não configuradas: {e}"),
            ));
        }
    };

    match updater.check().await {
        Ok(Some(update)) => Ok(CommandResponse::success(UpdateCheckDto {
            available: true,
            current_version,
            latest_version: Some(update.version),
            notes: update.body,
            date: update.date.map(|d| d.to_string()),
        })),
        Ok(None) => Ok(CommandResponse::success(UpdateCheckDto {
            available: false,
            current_version,
            latest_version: None,
            notes: None,
            date: None,
        })),
        Err(e) => Ok(CommandResponse::failure(
            "update_check_failed",
            format!("Falha ao verificar atualização: {e}"),
        )),
    }
}

#[tauri::command]
pub async fn install_app_update(
    app: tauri::AppHandle,
) -> Result<CommandResponse<String>, ()> {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            return Ok(CommandResponse::failure(
                "updater_unavailable",
                format!("Atualizações não configuradas: {e}"),
            ));
        }
    };

    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return Ok(CommandResponse::failure(
                "update_not_available",
                "Nenhuma atualização disponível",
            ));
        }
        Err(e) => {
            return Ok(CommandResponse::failure(
                "update_install_failed",
                format!("Falha ao verificar atualização: {e}"),
            ));
        }
    };

    if let Err(e) = update.download_and_install(|_chunk, _total| {}, || {}).await {
        return Ok(CommandResponse::failure(
            "update_install_failed",
            format!("Falha ao instalar atualização: {e}"),
        ));
    }

    Ok(CommandResponse::success(
        "Atualização instalada. Reinicie o Treplica para concluir.".into(),
    ))
}
