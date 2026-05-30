import { FormattedText } from "../../components/FormattedText";
import type { SuggestionDto } from "../../lib/types";

export interface OverlayGuidanceEntry {
  id: string;
  title: string;
  body: string;
  kind: "guidance" | "snapshot";
  imageDataUrl?: string;
}

interface Props {
  entries: OverlayGuidanceEntry[];
  onDismiss: (id: string) => void;
}

export function OverlayGuidanceStack({ entries, onDismiss }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="overlay-modal-layer" data-testid="overlay-guidance-stack">
      {entries.map((entry, index) => (
        <article
          key={entry.id}
          className={`overlay-guidance-modal ${entry.kind === "snapshot" ? "overlay-snapshot-modal" : ""}`}
          style={{ bottom: `${12 + index * 24}px` }}
          data-testid={`overlay-guidance-modal-${entry.id}`}
        >
          <header className="overlay-guidance-modal-header">
            <h4 className="overlay-guidance-modal-title">{entry.title}</h4>
            <button
              type="button"
              className="overlay-guidance-modal-close"
              aria-label="Fechar"
              onClick={() => onDismiss(entry.id)}
            >
              ×
            </button>
          </header>
          <div className="overlay-guidance-modal-body">
            {entry.imageDataUrl && (
              <img src={entry.imageDataUrl} alt="Captura de tela" data-testid="overlay-snapshot-image" />
            )}
            {entry.body && <FormattedText text={entry.body} />}
          </div>
        </article>
      ))}
    </div>
  );
}

export function suggestionToGuidanceEntry(s: SuggestionDto): OverlayGuidanceEntry {
  const isVision = Boolean(s.rationale?.startsWith("[Visão]"));
  return {
    id: s.id,
    title: isVision
      ? "Análise visual"
      : s.suggestion_type
        ? `Orientação · ${s.suggestion_type}`
        : "Orientação da IA",
    body: s.text,
    kind: isVision ? "snapshot" : "guidance",
  };
}
