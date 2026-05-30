use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageFormat;
use serde::Serialize;
use xcap::Monitor;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureMonitorDto {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub x: i32,
    pub y: i32,
}

/// Lists connected displays (primary first, then left-to-right).
pub fn list_monitors() -> Result<Vec<CaptureMonitorDto>, String> {
    let mut monitors: Vec<CaptureMonitorDto> = Monitor::all()
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|m| CaptureMonitorDto {
            id: m.id(),
            name: m.name().to_string(),
            width: m.width(),
            height: m.height(),
            is_primary: m.is_primary(),
            x: m.x(),
            y: m.y(),
        })
        .collect();
    monitors.sort_by(|a, b| {
        b.is_primary
            .cmp(&a.is_primary)
            .then_with(|| a.x.cmp(&b.x))
            .then_with(|| a.y.cmp(&b.y))
            .then_with(|| a.id.cmp(&b.id))
    });
    Ok(monitors)
}

pub fn default_primary_monitor_id() -> Result<u32, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    monitors
        .iter()
        .find(|m| m.is_primary())
        .or(monitors.first())
        .map(|m| m.id())
        .ok_or_else(|| "Nenhum monitor encontrado".to_string())
}

fn find_monitor(monitor_id: u32) -> Result<Monitor, String> {
    Monitor::all()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|m| m.id() == monitor_id)
        .ok_or_else(|| format!("Monitor {monitor_id} não encontrado ou desconectado"))
}

/// Captures a monitor by id as `data:image/png;base64,...`.
pub fn capture_monitor_data_url(monitor_id: u32) -> Result<String, String> {
    let monitor = find_monitor(monitor_id)?;
    let rgba = monitor.capture_image().map_err(|e| e.to_string())?;
    let mut buffer = std::io::Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(rgba)
        .write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let b64 = STANDARD.encode(buffer.into_inner());
    Ok(format!("data:image/png;base64,{b64}"))
}

/// Captures the primary monitor (legacy default).
pub fn capture_primary_monitor_data_url() -> Result<String, String> {
    capture_monitor_data_url(default_primary_monitor_id()?)
}
