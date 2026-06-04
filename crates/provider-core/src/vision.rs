use crate::{ProviderError, ProviderErrorCode, ProviderResult, SessionContextInput, TranscriptSnippet};

pub const VISION_SYSTEM_PROMPT: &str = r#"Você analisa imagens no contexto de um assistente de reuniões e conversas ao vivo (Treplica).

Sua tarefa:
1. Descrever o que aparece na imagem (texto visível, pessoas, interface, cena, produto, slide, frame de vídeo, etc.).
2. Relacionar com a transcrição recente, quando fornecida — por exemplo: de qual filme/série pode ser um diálogo, sobre o que é a reunião, o que o usuário provavelmente quer saber.
3. Ser útil para o usuário: resumo do contexto visual, hipóteses com grau de certeza, e sugestões práticas (como responder, o que pesquisar, o que observar).
4. Responder no idioma dominante da transcrição ou em português se não houver transcrição.
5. Não inventar detalhes ilegíveis na imagem; indique incerteza quando aplicável."#;

/// Cabeçalho curto para análise de imagem quando um assistente está selecionado.
const VISION_ASSISTANT_PREAMBLE: &str = r#"Você opera dentro do Treplica e está analisando uma imagem anexada (screenshot, slide, frame ou documento) no contexto da sessão. A mensagem inclui o contexto da sessão, materiais pré-reunião e a transcrição recente. Use o idioma dominante da transcrição e não invente detalhes ilegíveis na imagem. Siga integralmente as instruções abaixo — elas definem seu papel, comportamento e formato de resposta."#;

/// System prompt da análise visual.
///
/// Com assistente selecionado, o prompt do preset é autoritativo (precedido de um
/// cabeçalho de visão). Sem preset, usa o prompt de visão padrão.
pub fn build_vision_system_prompt(custom: Option<&str>) -> String {
    use crate::prompts::BREVITY_RULE;
    match custom {
        Some(s) if !s.trim().is_empty() => {
            format!("{VISION_ASSISTANT_PREAMBLE}\n\n{}\n\n{BREVITY_RULE}", s.trim())
        }
        _ => format!("{VISION_SYSTEM_PROMPT}\n\n{BREVITY_RULE}"),
    }
}

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

    if session_context
        .system_prompt
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
    {
        // Assistente selecionado: ele define o formato. Apenas garantimos que a imagem seja considerada.
        parts.push(
            "TAREFA: analise a imagem integrando-a ao contexto da sessão, aos materiais pré-reunião e à transcrição acima, e responda seguindo as instruções do seu sistema. Cumpra a REGRA DE BREVIDADE: o mínimo de palavras, leitura de relance. Não invente detalhes ilegíveis na imagem."
                .into(),
        );
    } else {
        parts.push(
            "TAREFA (leitura ao vivo, seja telegráfico): em 1–3 frases curtas, diga só o essencial — o que a imagem mostra e o que o usuário deve entender ou fazer agora, conectando à conversa se houver. Use o mínimo de palavras. Sem markdown, sem introdução. Não invente detalhes ilegíveis."
                .into(),
        );
    }
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
