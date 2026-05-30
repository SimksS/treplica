use base64::{engine::general_purpose::STANDARD, Engine};
use image::imageops::FilterType;
use image::ImageFormat;

const MAX_EDGE_PX: u32 = 1568;
const MAX_IMAGE_DECODE_BYTES: usize = 12 * 1024 * 1024;

/// Downscales large images before sending to vision APIs (token/cost limits).
pub fn prepare_image_data_url(data_url: &str) -> Result<String, String> {
    let trimmed = data_url.trim();
    if trimmed.is_empty() {
        return Err("imagem vazia".into());
    }

    let (mime, b64) = if let Some(rest) = trimmed.strip_prefix("data:") {
        let (meta, payload) = rest
            .split_once(',')
            .ok_or_else(|| "data URL inválida".to_string())?;
        let mime = meta.split(';').next().unwrap_or("image/png").trim();
        (mime.to_string(), payload.trim().to_string())
    } else {
        ("image/png".into(), trimmed.to_string())
    };

    if b64.len() > MAX_IMAGE_DECODE_BYTES * 4 / 3 + 1024 {
        return Err("imagem excede o limite de 12 MB".into());
    }
    let bytes = STANDARD
        .decode(&b64)
        .map_err(|e| format!("base64 inválido: {e}"))?;
    if bytes.len() > MAX_IMAGE_DECODE_BYTES {
        return Err("imagem decodificada excede o limite de 12 MB".into());
    }
    let img = image::load_from_memory(&bytes).map_err(|e| format!("imagem inválida: {e}"))?;
    let (w, h) = (img.width(), img.height());
    let longest = w.max(h);
    let resized = if longest > MAX_EDGE_PX {
        img.resize(MAX_EDGE_PX, MAX_EDGE_PX, FilterType::Triangle)
    } else {
        img
    };

    let out_mime = if mime.contains("jpeg") || mime.contains("jpg") {
        "image/jpeg"
    } else {
        "image/png"
    };

    let mut buffer = std::io::Cursor::new(Vec::new());
    if out_mime == "image/jpeg" {
        resized
            .write_to(&mut buffer, ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;
    } else {
        resized
            .write_to(&mut buffer, ImageFormat::Png)
            .map_err(|e| e.to_string())?;
    }
    let encoded = STANDARD.encode(buffer.into_inner());
    Ok(format!("data:{out_mime};base64,{encoded}"))
}
