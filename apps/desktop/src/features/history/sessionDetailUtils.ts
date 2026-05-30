const TYPE_LABELS: Record<string, string> = {
  answer: "Resposta sugerida",
  objection_response: "Objeção",
  follow_up_question: "Follow-up",
  talking_point: "Ponto de fala",
  next_step: "Próximo passo",
  fallback: "Orientação",
};

export function suggestionTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function formatHistoryTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function speakerDisplayName(label: string | null | undefined): string {
  const trimmed = label?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Participante";
}

/** Own voice (microphone) bubbles align to the right in chat layout. */
export function isOwnVoice(label: string | null | undefined): boolean {
  const l = speakerDisplayName(label).toLowerCase();
  return (
    l === "você" ||
    l === "you" ||
    l.includes("microfone") ||
    l === "eu"
  );
}

export function languagePairLabel(source: string, target: string): string {
  return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}
