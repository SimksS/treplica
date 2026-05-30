use base64::Engine;
use std::path::Path;

const MAX_DOCUMENT_BYTES: usize = 25 * 1024 * 1024;

pub fn parse_meeting_document(
    filename: &str,
    text: Option<&str>,
    content_base64: Option<&str>,
) -> Result<(String, String, String), String> {
    if let Some(t) = text {
        let trimmed = t.trim();
        if trimmed.is_empty() {
            return Err("O conteúdo do documento está vazio.".into());
        }
        let label = filename_label(filename);
        return Ok((trimmed.to_string(), label, "text".into()));
    }

    let b64 = content_base64.ok_or_else(|| {
        "Envie o texto do documento ou o arquivo em base64.".to_string()
    })?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64.trim())
        .map_err(|e| format!("Falha ao decodificar arquivo: {e}"))?;
    if bytes.len() > MAX_DOCUMENT_BYTES {
        return Err(format!(
            "Arquivo excede o limite de {} MB.",
            MAX_DOCUMENT_BYTES / (1024 * 1024)
        ));
    }

    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let attachment_kind = match ext.as_str() {
        "pdf" => "pdf",
        "png" | "jpg" | "jpeg" | "webp" | "gif" => "image",
        "txt" | "md" | "markdown" => "text",
        _ => {
            return Err(format!(
                "Formato não suportado (.{ext}). Use PDF, imagem, Markdown (.md) ou texto (.txt)."
            ));
        }
    };

    let extracted = match ext.as_str() {
        "pdf" => extract_pdf_text(&bytes).unwrap_or_default(),
        "png" | "jpg" | "jpeg" | "webp" | "gif" => String::new(),
        "txt" | "md" | "markdown" => {
            String::from_utf8(bytes)
                .map_err(|_| "Arquivo de texto com codificação inválida.".to_string())?
        }
        _ => String::new(),
    };

    if attachment_kind == "text" && extracted.trim().is_empty() {
        return Err("O conteúdo do documento está vazio.".into());
    }

    Ok((extracted.trim().to_string(), filename_label(filename), attachment_kind.into()))
}

fn filename_label(filename: &str) -> String {
    let name = Path::new(filename)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(filename);
    name.to_string()
}

fn extract_pdf_text(bytes: &[u8]) -> Result<String, String> {
    pdf_extract::extract_text_from_mem(bytes).map_err(|e| format!("Falha ao ler PDF: {e}"))
}
