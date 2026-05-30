import type {
  LiveSessionStateDto,
  SuggestionDto,
  TranscriptDto,
  TranslationDto,
} from "../../src/lib/types";
export const fixtureTranscripts: TranscriptDto[] = [
  {
    id: "seg-1",
    speaker_label: "Participante",
    text: "Qual o ROI esperado para este trimestre?",
    confidence: 0.92,
    is_uncertain: false,
  },
];

export const fixtureSuggestions: SuggestionDto[] = [
  {
    id: "sug-1",
    text: "Destaque payback em 6 meses e métricas de eficiência operacional.",
    suggestion_type: "answer",
    confidence: 0.82,
    rationale: "Baseado na pergunta sobre ROI",
    saved: false,
  },
];

export const fixtureTranslations: TranslationDto[] = [
  {
    id: "tr-1",
    transcript_segment_id: "seg-1",
    source_language: "pt-BR",
    target_language: "en",
    text: "[EN] Qual o ROI esperado para este trimestre?",
    confidence: 0.86,
    is_uncertain: false,
  },
];

export const fixtureContext = {
  session_id: "session-fixture-1",
  role: "Sales",
  objective: "Fechar contrato",
  audience: "Diretoria",
  company_or_product_notes: "SaaS B2B",
  preferred_tone: "Consultivo",
  forbidden_topics: null,
};

export const fixtureSuggestionsMixed: SuggestionDto[] = [
  {
    id: "sug-obj",
    text: "Reconheça a objeção de preço e destaque ROI em 6 meses.",
    suggestion_type: "objection_response",
    confidence: 0.82,
    rationale: "Objeção de preço detectada",
    saved: false,
  },
  ...fixtureSuggestions,
  {
    id: "sug-2",
    text: "Qual métrica de sucesso vocês usariam nos primeiros 90 dias?",
    suggestion_type: "follow_up_question",
    confidence: 0.85,
    rationale: "Follow-up após objeção de preço",
    saved: false,
  },
  {
    id: "sug-3",
    text: "Agendar workshop de ROI com o CFO na próxima semana.",
    suggestion_type: "next_step",
    confidence: 0.8,
    rationale: null,
    saved: false,
  },
];

export const fixtureLiveState: LiveSessionStateDto = {
  session: {
    id: "session-fixture-1",
    title: "Reunião demo",
    status: "listening",
    target_language: "en",
  },
  context: fixtureContext,
  transcripts: fixtureTranscripts,
  translations: fixtureTranslations,
  suggestions: fixtureSuggestionsMixed,
  transcripts_total: fixtureTranscripts.length,
  translations_total: fixtureTranslations.length,
  suggestions_total: fixtureSuggestionsMixed.length,
};