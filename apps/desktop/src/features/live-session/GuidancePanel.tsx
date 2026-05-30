import { useMemo, useState } from "react";
import { AiTypingIndicator } from "../../components/AiTypingIndicator";
import { FormattedText } from "../../components/FormattedText";
import type { SuggestionDto } from "../../lib/types";

interface Props {
  suggestions: SuggestionDto[];
  isTyping?: boolean;
  onCopy: (id: string) => void;
  onSave: (id: string) => void;
}

const CATEGORY_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "objection_response", label: "Objeções" },
  { id: "follow_up_question", label: "Follow-up" },
  { id: "next_step", label: "Próximo passo" },
  { id: "answer", label: "Respostas" },
  { id: "talking_point", label: "Pontos" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  answer: "Resposta",
  objection_response: "Objeção",
  follow_up_question: "Follow-up",
  talking_point: "Ponto",
  next_step: "Próximo passo",
  fallback: "Fallback",
};

export function GuidancePanel({ suggestions, isTyping = false, onCopy, onSave }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return suggestions;
    return suggestions.filter((s) => s.suggestion_type === filter);
  }, [suggestions, filter]);

  const nextSteps = useMemo(
    () => suggestions.filter((s) => s.suggestion_type === "next_step"),
    [suggestions],
  );

  return (
    <section className="panel" data-testid="guidance-panel">
      <div className="guidance-header">
        <h2 className="panel-title">Orientação</h2>
        <div className="guidance-filters" data-testid="guidance-filters">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={filter === cat.id ? "filter-chip active" : "filter-chip"}
              onClick={() => setFilter(cat.id)}
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {isTyping && (
        <AiTypingIndicator
          label="Gerando orientação com IA"
          testId="guidance-typing-indicator"
        />
      )}

      {nextSteps.length > 0 && (
        <div className="next-steps" data-testid="next-steps-block">
          <h3 className="next-steps-title">Próximos passos</h3>
          <ul>
            {nextSteps.map((s) => (
              <li key={s.id} data-testid="next-step-item">
                {s.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {filtered.length === 0 && !isTyping ? (
        <p className="empty-state" data-testid="guidance-empty">
          {filter === "all"
            ? "Com a sessão em escuta, orientações são geradas a partir das últimas 5 falas e do provedor configurado."
            : "Nenhuma sugestão nesta categoria ainda."}
        </p>
      ) : filtered.length > 0 ? (
        <ul className="guidance-list">
          {filtered.map((s) => (
            <li key={s.id} className="guidance-item" data-testid="guidance-item">
              <div className="guidance-meta">
                <span className="guidance-type" data-testid="guidance-type">
                  {TYPE_LABELS[s.suggestion_type] ?? s.suggestion_type}
                </span>
                {s.confidence < 0.6 && (
                  <span className="confidence-low" data-testid="low-confidence">
                    Baixa confiança
                  </span>
                )}
              </div>
              <div className="guidance-text"><FormattedText text={s.text} /></div>
              {s.rationale && (
                <p className="guidance-rationale">{s.rationale}</p>
              )}
              <div className="guidance-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onCopy(s.id)}
                  data-testid="btn-copy-suggestion"
                >
                  Copiar
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onSave(s.id)}
                  data-testid="btn-save-suggestion"
                >
                  {s.saved ? "Salvo" : "Salvar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <style>{`
        .guidance-header { display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-sm); }
        .guidance-filters { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
        .filter-chip {
          font-size: 0.75rem;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-surface-elevated);
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .filter-chip.active { border-color: var(--color-accent); color: var(--color-accent); }
        .next-steps {
          margin-bottom: var(--space-md);
          padding: var(--space-sm);
          background: var(--color-surface-elevated);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--color-accent);
        }
        .next-steps-title { margin: 0 0 var(--space-xs); font-size: 0.8125rem; color: var(--color-accent); }
        .next-steps ul { margin: 0; padding-left: var(--space-md); font-size: 0.875rem; }
        .empty-state { color: var(--color-text-muted); font-size: 0.875rem; margin: 0; }
        .guidance-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); max-height: 280px; overflow-y: auto; }
        .guidance-item { padding: var(--space-sm); background: var(--color-surface-elevated); border-radius: var(--radius-sm); }
        .guidance-meta { display: flex; gap: var(--space-sm); align-items: center; margin-bottom: var(--space-xs); }
        .guidance-type { font-size: 0.75rem; color: var(--color-accent); }
        .guidance-text { margin: 0 0 var(--space-xs); font-size: 0.9375rem; }
        .guidance-rationale { margin: 0 0 var(--space-sm); font-size: 0.75rem; color: var(--color-text-muted); }
        .guidance-actions { display: flex; gap: var(--space-sm); }
      `}</style>
    </section>
  );
}
