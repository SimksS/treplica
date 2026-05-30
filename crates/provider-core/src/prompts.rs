use crate::{GuidanceRequest, SuggestionType, TranscriptSnippet};

pub const DEFAULT_SYSTEM_PROMPT: &str = r#"Você é o Treplica, assistente local-first para conversas ao vivo, reuniões, aulas, vídeos, podcasts e diálogos transcritos.

Ao gerar ORIENTAÇÃO:
1. Leia a janela completa de transcrição (trechos numerados, do mais antigo ao mais recente) e reconstrua o contexto: tema, participantes, tom e momento da conversa.
2. Não responda só à última frase isolada — integre o que foi dito antes.
3. Infira o que o usuário provavelmente precisa: entender sobre o que é a conversa; identificar origem de falas (série, filme, vídeo, música, citação); saber como responder a uma pergunta; tratar objeção; sugerir próximo passo; ou outro apoio prático.
4. Responda no mesmo idioma dominante da transcrição (português quando for o caso).
5. Seja conciso, útil e honesto: se faltar contexto ou áudio estiver incompleto, diga o que falta em vez de inventar."#;

/// Builds the effective system prompt: custom prompt overrides/extends default.
pub fn build_system_prompt(custom: Option<&str>) -> String {
    match custom {
        Some(s) if !s.trim().is_empty() => format!(
            "{DEFAULT_SYSTEM_PROMPT}\n\n---\nINSTRUÇÕES ADICIONAIS DO USUÁRIO:\n{s}"
        ),
        _ => DEFAULT_SYSTEM_PROMPT.to_string(),
    }
}

pub fn build_user_prompt(request: &GuidanceRequest) -> String {
    let ctx = &request.session_context;
    let mut parts = vec![format!(
        "CONTEXTO DA SESSÃO:\n- Papel/função: {}\n- Objetivo: {}\n- Audiência: {}\n- Tom preferido: {}\n- Notas: {}\n- Evitar: {}",
        opt(&ctx.role),
        opt(&ctx.objective),
        opt(&ctx.audience),
        opt(&ctx.preferred_tone),
        opt(&ctx.company_or_product_notes),
        opt(&ctx.forbidden_topics),
    )];

    if let Some(pre) = ctx.pre_meeting_context.as_deref().filter(|s| !s.trim().is_empty()) {
        let source = ctx
            .pre_meeting_context_source
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("material fornecido pelo usuário");
        parts.push(format!(
            "CONTEXTO PRÉ-REUNIÃO — texto extraído ({source}):\n{pre}"
        ));
    }

    if !request.context_image_data_urls.is_empty() {
        parts.push(format!(
            "ANEXO VISUAL PRÉ-REUNIÃO: {} página(s) de imagem anexada(s) acompanham esta mensagem. \
             Leia slides, diagramas e texto nas imagens; integre com a transcrição ao orientar.",
            request.context_image_data_urls.len()
        ));
    }

    if let Some(st) = request.suggestion_type {
        parts.push(format!(
            "PISTA DE ESTILO (não obrigatório): {:?} — adapte se o contexto completo pedir outro tipo de ajuda.",
            st
        ));
    }

    let segment_count = request.recent_transcript.len();
    if segment_count == 0 {
        parts.push(
            "TRANSCRIÇÃO RECENTE: (ainda sem trechos — peça ao usuário para continuar a captura.)"
                .into(),
        );
    } else {
        let lines: Vec<String> = request
            .recent_transcript
            .iter()
            .enumerate()
            .map(|(i, seg)| format_transcript_line(i + 1, seg))
            .collect();
        parts.push(format!(
            "TRANSCRIÇÃO RECENTE ({segment_count} trechos, ordem cronológica — use TODOS para entender o contexto):\n{}",
            lines.join("\n")
        ));
    }

    parts.push(
        "TAREFA — ORIENTAÇÃO CONTEXTUAL:\n\
         a) Em 1–2 frases, diga sobre o que trata a conversa ou o trecho (tema, situação; se parecer diálogo de filme/série/vídeo, indique a hipótese e o grau de certeza).\n\
         b) Em seguida, oriente o usuário de forma prática: como responder, o que esclarecer, argumentos úteis ou próximo passo — conforme o que o contexto exigir.\n\
         c) Fundamente-se nos trechos numerados; mencione brevemente evidências quando relevante.\n\
         d) Se a transcrição for ambígua, incompleta ou só tiver fragmentos soltos, explique a limitação antes de concluir.\n\
         Formato: texto corrido, 4–10 frases. Não use markdown (sem asteriscos, hifens de lista ou cabeçalhos). Não repita a transcrição inteira."
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

fn format_transcript_line(index: usize, seg: &TranscriptSnippet) -> String {
    let speaker = seg
        .speaker_label
        .as_deref()
        .unwrap_or("Participante");
    format!(
        "[{index}] [{speaker}] {} (confiança {:.0}%)",
        seg.text,
        seg.confidence * 100.0
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_system_prompt_is_included() {
        let out = build_system_prompt(Some("Sempre cite a fonte quando possível"));
        assert!(out.contains("INSTRUÇÕES ADICIONAIS DO USUÁRIO"));
        assert!(out.contains("Sempre cite a fonte"));
    }

    #[test]
    fn user_prompt_includes_numbered_transcript() {
        let req = crate::GuidanceRequest {
            session_context: crate::SessionContextInput {
                role: Some("Sales".into()),
                ..Default::default()
            },
            recent_transcript: vec![
                crate::TranscriptSnippet {
                    speaker_label: Some("A".into()),
                    text: "Estamos falando do contrato anual".into(),
                    confidence: 0.9,
                },
                crate::TranscriptSnippet {
                    speaker_label: Some("B".into()),
                    text: "O preço parece alto".into(),
                    confidence: 0.88,
                },
            ],
            suggestion_type: None,
            privacy_mode: crate::PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
        };
        let user = build_user_prompt(&req);
        assert!(user.contains("[1]"));
        assert!(user.contains("[2]"));
        assert!(user.contains("contrato anual"));
        assert!(user.contains("preço parece alto"));
        assert!(user.contains("TODOS"));
        assert!(user.contains("ORIENTAÇÃO CONTEXTUAL"));
    }
}

pub fn parse_suggestion_type_hint(text: &str, fallback: SuggestionType) -> SuggestionType {
    let lower = text.to_lowercase();
    if lower.contains("obje") || lower.contains("preocup") {
        SuggestionType::ObjectionResponse
    } else if lower.contains('?') || lower.contains("pergunt") {
        SuggestionType::FollowUpQuestion
    } else if lower.contains("próximo passo") || lower.contains("proximo passo") {
        SuggestionType::NextStep
    } else if lower.contains("incerto") || lower.contains("esclarec") {
        SuggestionType::Fallback
    } else {
        fallback
    }
}
