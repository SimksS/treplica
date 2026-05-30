import { useMemo, useState } from "react";

import type { HistorySuggestionDto } from "../../lib/types";
import { formatHistoryTime, suggestionTypeLabel } from "./sessionDetailUtils";

interface Props {
  suggestions: HistorySuggestionDto[];
}

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "objection_response", label: "Objeções" },
  { id: "follow_up_question", label: "Follow-up" },
  { id: "next_step", label: "Próximos passos" },
  { id: "answer", label: "Respostas" },
] as const;

export function HistoryGuidanceTab({ suggestions }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return suggestions;
    return suggestions.filter((s) => s.suggestion_type === filter);
  }, [suggestions, filter]);

  if (suggestions.length === 0) {
    return (
      <p className="history-empty" data-testid="history-guidance-empty">
        Nenhuma orientação da IA foi gerada nesta sessão.
      </p>
    );
  }

  return (
    <div className="history-ai-list" data-testid="history-guidance-tab">
      <div className="history-filters" data-testid="history-guidance-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={
              filter === f.id ? "history-filter-chip active" : "history-filter-chip"
            }
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="history-ai-cards">
        {filtered.map((s) => (
          <li key={s.id} className="history-ai-card" data-testid="history-guidance-item">
            <header className="history-ai-card-header">
              <span className="history-ai-type">
                {suggestionTypeLabel(s.suggestion_type)}
              </span>
              <time dateTime={s.created_at}>{formatHistoryTime(s.created_at)}</time>
              {s.saved && <span className="history-ai-tag">Salva</span>}
            </header>
            <p className="history-ai-body">{s.text}</p>
            {s.rationale && (
              <p className="history-ai-rationale">{s.rationale}</p>
            )}
            <footer className="history-ai-footer">
              Confiança {Math.round(s.confidence * 100)}%
            </footer>
          </li>
        ))}
      </ul>
    </div>
  );
}
