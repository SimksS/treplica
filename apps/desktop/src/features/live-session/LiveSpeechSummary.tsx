import type { LiveSpeechMode } from "../../lib/liveLanguages";
import {
  sourceLanguageLabel,
  targetLanguageLabel,
} from "../../lib/liveLanguages";

interface Props {
  mode: LiveSpeechMode;
  sourceLanguage: string;
  targetLanguage: string;
  compact?: boolean;
}

export function LiveSpeechSummary({
  mode,
  sourceLanguage,
  targetLanguage,
  compact = false,
}: Props) {
  const translation = mode === "translation" && Boolean(targetLanguage);

  return (
    <p
      className={`live-speech-summary${compact ? " live-speech-summary--compact" : ""}`}
      data-testid="live-speech-summary"
    >
      <span className="live-speech-summary-label">Áudio da sessão</span>
      {translation ? (
        <>
          {" "}
          — tradução ({sourceLanguageLabel(sourceLanguage)} →{" "}
          {targetLanguageLabel(targetLanguage)})
        </>
      ) : (
        <> — transcrição ({sourceLanguageLabel(sourceLanguage)})</>
      )}
      <span className="live-speech-summary-hint">
        {" "}
        Definido no modal Iniciar reunião.
      </span>
      <style>{`
        .live-speech-summary {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.4;
          color: var(--color-text-muted, #8b9cb3);
        }
        .live-speech-summary--compact {
          font-size: 0.6875rem;
        }
        .live-speech-summary-label {
          color: inherit;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-size: 0.625rem;
        }
        .live-speech-summary--compact .live-speech-summary-label {
          font-size: 0.5625rem;
        }
        .live-speech-summary-hint {
          opacity: 0.85;
        }
      `}</style>
    </p>
  );
}
