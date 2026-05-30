import type {
  GeneratedDocumentDto,
  SessionDetailDto,
  SessionHistoryItemDto,
} from "../../src/lib/types";

export const fixtureHistoryItems: SessionHistoryItemDto[] = [
  {
    id: "session-1",
    title: "Reunião encerrada",
    status: "ended",
    transcript_count: 5,
    suggestion_count: 2,
    document_count: 1,
    started_at: "2026-05-22T09:30:00Z",
    ended_at: "2026-05-22T10:00:00Z",
    assistant_preset_id: "sales",
  },
  {
    id: "session-2",
    title: "Reunião ao vivo",
    status: "listening",
    transcript_count: 10,
    suggestion_count: 0,
    document_count: 0,
    started_at: "2026-05-22T11:00:00Z",
    ended_at: null,
    assistant_preset_id: "note-taker",
  },
];

export const fixtureDocuments: GeneratedDocumentDto[] = [
  {
    id: "doc-1",
    session_id: "session-1",
    doc_type: "summary",
    title: "Resumo: Reunião encerrada",
    content: "# Resumo\n\nPontos principais discutidos.",
    format: "markdown",
    storage_path: "/tmp/summary.md",
    created_at: "2026-05-22T10:05:00Z",
  },
];

export const fixtureSessionDetail: SessionDetailDto = {
  session: fixtureHistoryItems[0],
  context: {
    session_id: "session-1",
    role: "Sales",
    objective: "Fechar contrato",
    audience: null,
    company_or_product_notes: null,
    pre_meeting_context: "Briefing da reunião com o cliente.",
    pre_meeting_context_source: "briefing.md",
    preferred_tone: null,
    forbidden_topics: null,
  },
  transcripts: [
    {
      id: "t1",
      speaker_label: "Participante",
      text: "Qual o ROI?",
      is_uncertain: false,
      created_at: "2026-05-22T10:01:00Z",
    },
    {
      id: "t2",
      speaker_label: "Você",
      text: "O payback é de 6 meses.",
      is_uncertain: false,
      created_at: "2026-05-22T10:02:00Z",
    },
  ],
  translations: [
    {
      id: "tr1",
      transcript_segment_id: "t1",
      source_language: "en",
      target_language: "pt",
      text: "Qual é o ROI?",
      is_uncertain: false,
      created_at: "2026-05-22T10:01:05Z",
    },
  ],
  suggestions: [
    {
      id: "s1",
      text: "Destaque payback",
      suggestion_type: "answer",
      confidence: 0.8,
      rationale: "Cliente perguntou sobre ROI.",
      saved: true,
      created_at: "2026-05-22T10:02:30Z",
    },
  ],
  provider_calls: [
    {
      id: "p1",
      purpose: "guidance",
      status: "success",
      local_or_hosted: "local",
    },
  ],
  documents: fixtureDocuments,
  audit_events: [
    {
      id: "a1",
      category: "document",
      action: "document_generated",
      severity: "info",
      created_at: "2026-05-22T10:05:00Z",
    },
  ],
};
