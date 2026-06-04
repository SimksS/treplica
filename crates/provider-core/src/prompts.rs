use crate::{GuidanceRequest, SuggestionType, TranscriptSnippet};

pub const DEFAULT_SYSTEM_PROMPT: &str = r#"Você é o Treplica, assistente local-first para conversas ao vivo, reuniões, aulas, vídeos, podcasts e diálogos transcritos.

Ao gerar ORIENTAÇÃO:
1. Leia a janela completa de transcrição (trechos numerados, do mais antigo ao mais recente) e reconstrua o contexto: tema, participantes, tom e momento da conversa.
2. Não responda só à última frase isolada — integre o que foi dito antes.
3. Infira o que o usuário provavelmente precisa: entender sobre o que é a conversa; identificar origem de falas (série, filme, vídeo, música, citação); saber como responder a uma pergunta; tratar objeção; sugerir próximo passo; ou outro apoio prático.
4. Responda no mesmo idioma dominante da transcrição (português quando for o caso).
5. Seja conciso, útil e honesto: se faltar contexto ou áudio estiver incompleto, diga o que falta em vez de inventar.
6. OBEDEÇA às instruções do usuário no contexto da sessão e nos materiais: se ele pedir um formato, uma palavra específica, uma restrição ou um marcador, cumpra exatamente."#;

/// Cabeçalho curto que mantém o assistente ciente de que opera dentro do Treplica,
/// sem competir com as instruções do próprio assistente.
pub const ASSISTANT_PREAMBLE: &str = r#"Você opera dentro do Treplica, assistente local-first para conversas ao vivo, reuniões, aulas, vídeos, podcasts e diálogos transcritos. A cada mensagem você recebe o contexto da sessão, os materiais pré-reunião (texto e/ou imagens) e a transcrição recente. Use o idioma dominante da transcrição. Siga integralmente as instruções abaixo — elas definem seu papel, comportamento e formato de resposta. IMPORTANTE: o usuário também pode dar instruções no contexto da sessão (ex.: incluir uma palavra específica, um formato ou uma restrição); cumpra-as à risca, mesmo que pareçam incomuns."#;

/// Regra de brevidade prioritária — anexada como instrução FINAL em todo system prompt
/// (inclusive sobre presets), pois a resposta é lida ao vivo durante a conversa.
pub const BREVITY_RULE: &str = r#"REGRA DE BREVIDADE (PRIORITÁRIA — vale sobre qualquer formato descrito acima): a resposta é lida de relance durante a conversa ao vivo. LIMITE RÍGIDO: no máximo 2 frases curtas OU 3 marcadores de até ~6 palavras cada; o total quase nunca passa de 30 palavras. Entregue só o ponto acionável. PROIBIDO: introdução, preâmbulo, repetir a pergunta, rótulos/cabeçalhos longos, frase de encerramento. Se um formato acima for longo, ignore o que for supérfluo — brevidade vence o formato. (Exceção: cumpra qualquer instrução explícita do usuário, como incluir uma palavra específica.)"#;

/// Hard ceiling on guidance output length (tokens). The prompt targets ≈30 words; this
/// is a firm physical backstop against runaway responses (a preset's verbose format
/// can otherwise drift long). ~160 tokens ≈ 110 words — short for live reading, with
/// enough headroom that a normal brief answer is never truncated mid-sentence.
pub const GUIDANCE_MAX_TOKENS: u32 = 160;

/// Whether a non-empty custom/preset system prompt was provided.
pub fn has_custom_prompt(custom: Option<&str>) -> bool {
    custom.map(|s| !s.trim().is_empty()).unwrap_or(false)
}

/// Builds the effective system prompt.
///
/// When an assistant preset / custom prompt is selected it becomes authoritative
/// (precedido de um cabeçalho curto do Treplica). A regra de brevidade é sempre a
/// instrução final, para a orientação ser lida de relance ao vivo.
pub fn build_system_prompt(custom: Option<&str>) -> String {
    match custom {
        Some(s) if !s.trim().is_empty() => {
            format!("{ASSISTANT_PREAMBLE}\n\n{}\n\n{BREVITY_RULE}", s.trim())
        }
        _ => format!("{DEFAULT_SYSTEM_PROMPT}\n\n{BREVITY_RULE}"),
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
            .unwrap_or("instruções/material do usuário");
        parts.push(format!(
            "CONTEXTO E INSTRUÇÕES DO USUÁRIO PARA ESTA SESSÃO ({source}) — PRIORITÁRIO: leia com atenção e CUMPRA qualquer pedido explícito aqui (formato, palavra a incluir, restrição), mesmo que pareça incomum:\n{pre}"
        ));
    }

    if !request.context_image_data_urls.is_empty() {
        parts.push(format!(
            "ANEXO VISUAL PRÉ-REUNIÃO: {} página(s) de imagem anexada(s) acompanham esta mensagem. \
             Leia slides, diagramas e texto nas imagens; integre com a transcrição ao orientar.",
            request.context_image_data_urls.len()
        ));
    }

    if let Some(hint) = style_hint(request) {
        parts.push(hint);
    }
    parts.push(transcript_block(request));
    parts.push(guidance_task(has_custom_prompt(ctx.system_prompt.as_deref())));
    parts.join("\n\n")
}

/// Current-turn prompt for a follow-up request, when the session context and
/// materials were already provided in the first turn (kept in conversation memory).
/// Sends only the recent transcript window + the terse task, anchoring to history.
pub fn build_followup_user_prompt(request: &GuidanceRequest) -> String {
    let mut parts = vec![
        "ATUALIZAÇÃO DA CONVERSA — o contexto da sessão e os materiais já foram fornecidos no início desta conversa; mantenha-os em mente. Abaixo, os trechos mais recentes."
            .to_string(),
    ];
    if let Some(hint) = style_hint(request) {
        parts.push(hint);
    }
    parts.push(transcript_block(request));
    parts.push(guidance_task(has_custom_prompt(
        request.session_context.system_prompt.as_deref(),
    )));
    parts.join("\n\n")
}

fn style_hint(request: &GuidanceRequest) -> Option<String> {
    request.suggestion_type.map(|st| {
        format!(
            "PISTA DE ESTILO (não obrigatório): {:?} — adapte se o contexto completo pedir outro tipo de ajuda.",
            st
        )
    })
}

fn transcript_block(request: &GuidanceRequest) -> String {
    let segment_count = request.recent_transcript.len();
    if segment_count == 0 {
        return "TRANSCRIÇÃO RECENTE: (ainda sem trechos — peça ao usuário para continuar a captura.)"
            .to_string();
    }
    let lines: Vec<String> = request
        .recent_transcript
        .iter()
        .enumerate()
        .map(|(i, seg)| format_transcript_line(i + 1, seg))
        .collect();
    format!(
        "TRANSCRIÇÃO RECENTE ({segment_count} trechos, ordem cronológica — use TODOS para entender o contexto):\n{}",
        lines.join("\n")
    )
}

fn guidance_task(has_custom: bool) -> String {
    if has_custom {
        // Um assistente foi selecionado: ele define papel, comportamento e formato.
        // Não impomos uma tarefa/formato rígido que contradiga as instruções do assistente.
        "TAREFA: responda agora seguindo as instruções do seu sistema. CUMPRA qualquer instrução explícita do usuário no contexto da sessão acima (formato, palavra a incluir, restrição). Respeite a REGRA DE BREVIDADE: no máximo ~30 palavras, leitura de relance. Se faltar contexto, diga-o em vez de inventar."
            .to_string()
    } else {
        "TAREFA — ORIENTAÇÃO CONTEXTUAL (telegráfica): em no máximo 2 frases curtas (≈30 palavras), entregue só o essencial acionável. CUMPRA qualquer instrução explícita do usuário no contexto da sessão acima (ex.: incluir uma palavra específica). Sem markdown, sem introdução, sem repetir a transcrição."
            .to_string()
    }
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
    fn custom_system_prompt_is_authoritative() {
        let out = build_system_prompt(Some("Sempre cite a fonte quando possível"));
        // O preset/custom é autoritativo, apenas precedido do cabeçalho do Treplica.
        assert!(out.contains("Treplica"));
        assert!(out.contains("Sempre cite a fonte"));
        // Não rebaixa o prompt do usuário a "instruções adicionais".
        assert!(!out.contains("INSTRUÇÕES ADICIONAIS DO USUÁRIO"));
    }

    #[test]
    fn no_custom_prompt_uses_default() {
        let out = build_system_prompt(None);
        assert!(out.starts_with(DEFAULT_SYSTEM_PROMPT));
        assert!(out.contains("BREVIDADE"));
        assert_eq!(build_system_prompt(Some("   ")), build_system_prompt(None));
    }

    #[test]
    fn brevity_rule_is_always_appended_last() {
        let with_custom = build_system_prompt(Some("Você é um vendedor."));
        assert!(with_custom.contains("BREVIDADE"));
        assert!(with_custom.trim_end().ends_with(BREVITY_RULE));
    }

    #[test]
    fn user_prompt_defers_to_assistant_when_custom_present() {
        let req = crate::GuidanceRequest {
            session_context: crate::SessionContextInput {
                system_prompt: Some("Você é um vendedor consultivo.".into()),
                ..Default::default()
            },
            recent_transcript: vec![crate::TranscriptSnippet {
                speaker_label: Some("A".into()),
                text: "Qual o preço?".into(),
                confidence: 0.9,
            }],
            suggestion_type: None,
            privacy_mode: crate::PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
            conversation: vec![],
        };
        let user = build_user_prompt(&req);
        assert!(user.contains("instruções do seu sistema"));
        // A tarefa rígida/genérica não deve ser imposta sobre o assistente.
        assert!(!user.contains("ORIENTAÇÃO CONTEXTUAL"));
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
            conversation: vec![],
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
