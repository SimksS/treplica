use provider_core::{SessionContextInput, SuggestionType, TranscriptSnippet};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GuidanceScenario {
    Sales,
    Interview,
    Leadership,
    Presentation,
    General,
}

#[derive(Debug, Clone)]
pub struct ClassificationResult {
    pub suggestion_type: SuggestionType,
    #[allow(dead_code)]
    pub scenario: GuidanceScenario,
    pub scenario_hint: String,
}

pub struct GuidanceClassifier;

impl GuidanceClassifier {
    pub fn classify(
        ctx: &SessionContextInput,
        recent: &[TranscriptSnippet],
    ) -> ClassificationResult {
        let scenario = detect_scenario(ctx);
        let scenario_hint = scenario_prompt(&scenario, ctx);
        let suggestion_type = classify_from_transcript(recent);
        ClassificationResult {
            suggestion_type,
            scenario,
            scenario_hint,
        }
    }
}

pub fn detect_scenario(ctx: &SessionContextInput) -> GuidanceScenario {
    let role = ctx.role.as_deref().unwrap_or("").to_lowercase();
    if role.contains("vend") || role.contains("sales") || role.contains("comercial") {
        GuidanceScenario::Sales
    } else if role.contains("entrev") || role.contains("interview") {
        GuidanceScenario::Interview
    } else if role.contains("lider") || role.contains("execut") || role.contains("leadership") {
        GuidanceScenario::Leadership
    } else if role.contains("apresent") || role.contains("present") {
        GuidanceScenario::Presentation
    } else {
        GuidanceScenario::General
    }
}

pub fn scenario_prompt(scenario: &GuidanceScenario, ctx: &SessionContextInput) -> String {
    let objective = ctx
        .objective
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("objetivo da conversa");
    match scenario {
        GuidanceScenario::Sales => format!(
            "Cenário vendas: responda objeções com valor, ROI e proponha próximo passo comercial. Objetivo: {objective}."
        ),
        GuidanceScenario::Interview => format!(
            "Cenário entrevista: respostas claras, exemplos STAR e perguntas de follow-up relevantes. Objetivo: {objective}."
        ),
        GuidanceScenario::Leadership => format!(
            "Cenário liderança: tom decisivo, alinhamento de equipe e próximos passos acionáveis. Objetivo: {objective}."
        ),
        GuidanceScenario::Presentation => format!(
            "Cenário apresentação: mensagens concisas, gancho de valor e transição para Q&A. Objetivo: {objective}."
        ),
        GuidanceScenario::General => format!(
            "Cenário geral: interprete a transcrição completa (pode ser reunião, aula, vídeo, podcast ou diálogo de filme/série). \
             Resuma o assunto antes de orientar. Objetivo: {objective}."
        ),
    }
}

fn classify_from_transcript(recent: &[TranscriptSnippet]) -> SuggestionType {
    if recent.is_empty() {
        return SuggestionType::TalkingPoint;
    }

    let window: Vec<&TranscriptSnippet> = recent.iter().rev().take(12).collect();
    let mut saw_low_confidence = false;

    for seg in &window {
        if seg.confidence < 0.5 || seg.text.trim() == "???" {
            saw_low_confidence = true;
            continue;
        }
        let lower = seg.text.to_lowercase();

        if contains_objection(&lower) {
            return SuggestionType::ObjectionResponse;
        }
        if contains_next_step(&lower) {
            return SuggestionType::NextStep;
        }
        if contains_follow_up(&lower) {
            return SuggestionType::FollowUpQuestion;
        }
        if seg.text.contains('?') {
            return SuggestionType::Answer;
        }
    }

    if saw_low_confidence {
        return SuggestionType::Fallback;
    }

    SuggestionType::TalkingPoint
}

fn contains_objection(lower: &str) -> bool {
    [
        "obje",
        "objection",
        "muito caro",
        "preço alto",
        "não tenho budget",
        "nao tenho budget",
        "não faz sentido",
        "nao faz sentido",
    ]
    .iter()
    .any(|k| lower.contains(k))
}

fn contains_next_step(lower: &str) -> bool {
    [
        "próximo passo",
        "proximo passo",
        "next step",
        "agendar",
        "fechar",
        "contrato",
    ]
    .iter()
    .any(|k| lower.contains(k))
}

fn contains_follow_up(lower: &str) -> bool {
    [
        "pode detalhar",
        "mais clareza",
        "como funciona",
        "explique",
        "follow-up",
        "follow up",
    ]
    .iter()
    .any(|k| lower.contains(k))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_objection_from_transcript() {
        let result = GuidanceClassifier::classify(
            &SessionContextInput::default(),
            &[TranscriptSnippet {
                speaker_label: None,
                text: "Temos uma objeção sobre o preço".into(),
                confidence: 0.9,
            }],
        );
        assert_eq!(result.suggestion_type, SuggestionType::ObjectionResponse);
    }

    #[test]
    fn uses_newest_transcript_segment_for_classification() {
        let result = GuidanceClassifier::classify(
            &SessionContextInput::default(),
            &[
                TranscriptSnippet {
                    speaker_label: Some("A".into()),
                    text: "Bom dia, podemos começar?".into(),
                    confidence: 0.9,
                },
                TranscriptSnippet {
                    speaker_label: Some("B".into()),
                    text: "Temos uma objeção sobre o preço proposto.".into(),
                    confidence: 0.9,
                },
            ],
        );
        assert_eq!(result.suggestion_type, SuggestionType::ObjectionResponse);
    }

    #[test]
    fn detects_question_from_earlier_segment_when_latest_is_neutral() {
        let result = GuidanceClassifier::classify(
            &SessionContextInput::default(),
            &[
                TranscriptSnippet {
                    speaker_label: Some("A".into()),
                    text: "Qual é o prazo de entrega do projeto?".into(),
                    confidence: 0.92,
                },
                TranscriptSnippet {
                    speaker_label: Some("B".into()),
                    text: "Entendi, obrigado.".into(),
                    confidence: 0.9,
                },
            ],
        );
        assert_eq!(result.suggestion_type, SuggestionType::Answer);
    }

    #[test]
    fn maps_sales_role_to_scenario() {
        let scenario = detect_scenario(&SessionContextInput {
            role: Some("Sales rep".into()),
            ..Default::default()
        });
        assert_eq!(scenario, GuidanceScenario::Sales);
    }
}
