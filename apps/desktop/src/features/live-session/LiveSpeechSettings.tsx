import type { LiveSpeechMode } from "../../lib/liveLanguages";
import {
  isTranslationModeReady,
  sourceLanguageLabel,
  SPEECH_SOURCE_LANGUAGES,
  SPEECH_TARGET_LANGUAGES,
} from "../../lib/liveLanguages";

export { isTranslationModeReady };

interface Props {
  mode: LiveSpeechMode;
  sourceLanguage: string;
  targetLanguage: string;
  disabled?: boolean;
  compact?: boolean;
  onModeChange: (mode: LiveSpeechMode) => void;
  onSourceChange: (code: string) => void;
  onTargetChange: (code: string) => void;
}

export function LiveSpeechSettings({
  mode,
  sourceLanguage,
  targetLanguage,
  disabled = false,
  compact = false,
  onModeChange,
  onSourceChange,
  onTargetChange,
}: Props) {
  const translationMode = mode === "translation";
  const targetMissing = translationMode && !targetLanguage;

  return (
    <div
      className={`live-speech-settings${compact ? " live-speech-settings--compact" : ""}`}
      data-testid="live-speech-settings"
    >
      <fieldset className="live-speech-mode" disabled={disabled}>
        <legend className="live-speech-legend">Modo de áudio</legend>
        <label>
          <input
            type="radio"
            name="live-speech-mode"
            checked={mode === "transcription"}
            onChange={() => onModeChange("transcription")}
            data-testid="speech-mode-transcription"
          />
          Só transcrição
        </label>
        <label>
          <input
            type="radio"
            name="live-speech-mode"
            checked={translationMode}
            onChange={() => onModeChange("translation")}
            data-testid="speech-mode-translation"
          />
          Transcrever e traduzir
        </label>
      </fieldset>

      <label className="live-speech-field">
        <span className="live-speech-label">Idioma da fala</span>
        <select
          value={sourceLanguage}
          disabled={disabled}
          onChange={(e) => onSourceChange(e.target.value)}
          data-testid="speech-source-language"
        >
          {SPEECH_SOURCE_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </label>

      {translationMode && (
        <label className="live-speech-field">
          <span className="live-speech-label">Traduzir para</span>
          <select
            value={targetLanguage}
            disabled={disabled}
            onChange={(e) => onTargetChange(e.target.value)}
            data-testid="speech-target-language"
            aria-invalid={targetMissing}
          >
            {SPEECH_TARGET_LANGUAGES.map((lang) => (
              <option key={lang.code || "none"} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {targetMissing && (
        <p className="live-speech-hint live-speech-hint--warn" role="alert">
          Escolha o idioma de destino para ativar a tradução automática.
        </p>
      )}

      {translationMode && targetLanguage && (
        <p className="live-speech-hint" data-testid="speech-translation-hint">
          O <strong>Whisper</strong> só transcreve o áudio (
          {sourceLanguage === "auto"
            ? "idioma detectado automaticamente"
            : sourceLanguageLabel(sourceLanguage)}
          ). A <strong>tradução</strong> aparece no painel Tradução via modelo de
          chat configurado em Provedores → Tradução.
        </p>
      )}

      <style>{`
        .live-speech-settings {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.8125rem;
        }
        .live-speech-settings--compact {
          gap: 8px;
          font-size: 0.6875rem;
        }
        .live-speech-mode {
          border: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
        }
        .live-speech-legend {
          width: 100%;
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-text-muted, #8b9cb3);
          margin-bottom: 2px;
        }
        .live-speech-settings--compact .live-speech-legend {
          font-size: 0.5625rem;
        }
        .live-speech-field {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .live-speech-label {
          color: var(--color-text-muted, #8b9cb3);
          min-width: 6.5rem;
        }
        .live-speech-settings select {
          background: var(--color-surface-elevated, rgba(255,255,255,0.08));
          color: inherit;
          border: 1px solid var(--color-border, rgba(255,255,255,0.15));
          border-radius: 6px;
          padding: 4px 8px;
          font-size: inherit;
        }
        .live-speech-hint {
          margin: 0;
          color: var(--color-text-muted, #8b9cb3);
          line-height: 1.35;
        }
        .live-speech-hint--warn {
          color: #f5a623;
        }
      `}</style>
    </div>
  );
}
