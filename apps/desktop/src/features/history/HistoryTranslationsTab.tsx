import type { HistoryTranslationDto } from "../../lib/types";
import { formatHistoryTime, languagePairLabel } from "./sessionDetailUtils";

interface Props {
  translations: HistoryTranslationDto[];
}

export function HistoryTranslationsTab({ translations }: Props) {
  if (translations.length === 0) {
    return (
      <p className="history-empty" data-testid="history-translations-empty">
        Nenhuma tradução automática nesta sessão. Ative o modo tradução no overlay
        para gerar traduções após cada trecho.
      </p>
    );
  }

  return (
    <ul className="history-ai-cards" data-testid="history-translations-tab">
      {translations.map((t) => (
        <li key={t.id} className="history-ai-card history-ai-card--translation">
          <header className="history-ai-card-header">
            <span className="history-ai-type history-ai-type--translation">
              {languagePairLabel(t.source_language, t.target_language)}
            </span>
            <time dateTime={t.created_at}>{formatHistoryTime(t.created_at)}</time>
          </header>
          <p className="history-ai-body">{t.text}</p>
          {t.is_uncertain && (
            <span className="history-ai-tag history-ai-tag--warn">Incerto</span>
          )}
        </li>
      ))}
    </ul>
  );
}
