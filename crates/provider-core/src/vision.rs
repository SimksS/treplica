use crate::{ProviderError, ProviderErrorCode, ProviderResult, SessionContextInput, TranscriptSnippet};

pub const VISION_SYSTEM_PROMPT: &str = r#"Você analisa imagens no contexto de um assistente de reuniões e conversas ao vivo (Treplica).

Sua tarefa:
1. Descrever o que aparece na imagem (texto visível, pessoas, interface, cena, produto, slide, frame de vídeo, etc.).
2. Relacionar com a transcrição recente, quando fornecida — por exemplo: de qual filme/série pode ser um diálogo, sobre o que é a reunião, o que o usuário provavelmente quer saber.
3. Ser útil para o usuário: resumo do contexto visual, hipóteses com grau de certeza, e sugestões práticas (como responder, o que pesquisar, o que observar).
4. Responder no idioma dominante da transcrição ou em português se não houver transcrição.
5. Não inventar detalhes ilegíveis na imagem; indique incerteza quando aplicável."#;

#[derive(Debug, Clone)]
pub struct ParsedImage {
    pub mime: String,
    /// Full data URL for OpenAI-compatible APIs.
    pub data_url: String,
    /// Raw base64 payload without prefix (Ollama).
    pub base64_payload: String,
}

pub fn parse_image_data_url(input: &str) -> ProviderResult<ParsedImage> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(ProviderError::structured(
            ProviderErrorCode::InvalidConfiguration,
            "imagem vazia",
        ));
    }

    if let Some(rest) = trimmed.strip_prefix("data:") {
        let (meta, payload) = rest.split_once(',').ok_or_else(|| {
            ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "data URL de imagem inválida",
            )
        })?;
        let mime = meta
            .split(';')
            .next()
            .unwrap_or("image/png")
            .trim()
            .to_string();
        let base64_payload = payload.trim().to_string();
        if base64_payload.is_empty() {
            return Err(ProviderError::structured(
                ProviderErrorCode::InvalidConfiguration,
                "payload base64 vazio",
            ));
        }
        return Ok(ParsedImage {
            mime: mime.clone(),
            data_url: trimmed.to_string(),
            base64_payload,
        });
    }

    // Assume raw base64 PNG if no prefix.
    Ok(ParsedImage {
        mime: "image/png".into(),
        data_url: format!("data:image/png;base64,{trimmed}"),
        base64_payload: trimmed.to_string(),
    })
}

pub fn build_vision_user_prompt(
    session_context: &SessionContextInput,
    recent_transcript: &[TranscriptSnippet],
    source: Option<&str>,
) -> String {
    let mut parts = vec![format!(
        "CONTEXTO DA SESSÃO:\n- Papel: {}\n- Objetivo: {}\n- Notas: {}\n- Contexto pré-reunião: {}",
        opt(&session_context.role),
        opt(&session_context.objective),
        opt(&session_context.company_or_product_notes),
        opt(&session_context.pre_meeting_context),
    )];

    if let Some(src) = source.filter(|s| !s.is_empty()) {
        parts.push(format!("ORIGEM DA IMAGEM: {src}"));
    }

    if recent_transcript.is_empty() {
        parts.push("TRANSCRIÇÃO RECENTE: (nenhum trecho ainda)".into());
    } else {
        let lines: Vec<String> = recent_transcript
            .iter()
            .enumerate()
            .map(|(i, seg)| {
                let speaker = seg.speaker_label.as_deref().unwrap_or("Participante");
                format!("[{}] [{speaker}] {}", i + 1, seg.text)
            })
            .collect();
        parts.push(format!(
            "TRANSCRIÇÃO RECENTE ({} trechos, use para contextualizar a imagem):\n{}",
            recent_transcript.len(),
            lines.join("\n")
        ));
    }

    parts.push(
        "Analise a imagem anexada e responda em texto corrido (4–12 frases), sem usar markdown (sem asteriscos, hifens de lista ou cabeçalhos):\n\
         a) O que a imagem mostra;\n\
         b) Como isso se relaciona com a conversa/transcrição, se houver;\n\
         c) O que o usuário provavelmente quer entender ou fazer a seguir."
            .into(),
    );
    parts.join("\n\n")
}

fn opt(value: &Option<String>) -> String {
    value
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("—")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_data_url() {
        let parsed = parse_image_data_url("data:image/png;base64,abcd").expect("parse");
        assert_eq!(parsed.mime, "image/png");
        assert_eq!(parsed.base64_payload, "abcd");
    }
}
