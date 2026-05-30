import { AiTypingIndicator } from "../../components/AiTypingIndicator";
import type { TranslationDto } from "../../lib/types";

interface Props {
  translations: TranslationDto[];
  enabled: boolean;
  isTyping?: boolean;
}

export function TranslationPanel({ translations, enabled, isTyping = false }: Props) {
  if (!enabled) {
    return (
      <section className="panel" data-testid="translation-panel-disabled">
        <h2 className="panel-title">Tradução</h2>
        <p className="empty-state">Selecione um idioma de destino para ver traduções.</p>
      </section>
    );
  }

  return (
    <section className="panel" data-testid="translation-panel">
      <h2 className="panel-title">Tradução ao vivo</h2>
      {isTyping && (
        <AiTypingIndicator
          label="Traduzindo com IA"
          testId="translation-typing-indicator"
        />
      )}
      {translations.length === 0 && !isTyping ? (
        <p className="empty-state" data-testid="translation-empty">
          Traduções aparecerão após novos trechos de transcrição.
        </p>
      ) : (
        <ul className="translation-list">
          {translations.map((t) => (
            <li key={t.id} className="translation-item" data-testid="translation-item">
              <div className="translation-meta">
                <span>
                  {t.source_language} → {t.target_language}
                </span>
                {t.is_uncertain && (
                  <span className="confidence-low" data-testid="translation-uncertain">
                    Incerto
                  </span>
                )}
              </div>
              <p className="translation-text">{t.text}</p>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .empty-state { color: var(--color-text-muted); font-size: 0.875rem; margin: 0; }
        .translation-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-sm); max-height: 240px; overflow-y: auto; }
        .translation-item { padding: var(--space-sm); background: var(--color-surface-elevated); border-radius: var(--radius-sm); }
        .translation-meta { display: flex; gap: var(--space-sm); font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: var(--space-xs); }
        .translation-text { margin: 0; font-size: 0.875rem; }
      `}</style>
    </section>
  );
}
