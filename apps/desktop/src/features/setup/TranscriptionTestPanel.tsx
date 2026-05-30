import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AiTypingIndicator } from "../../components/AiTypingIndicator";
import { useMicrophoneLevel } from "../../hooks/useMicrophoneStream";
import { formatSendShortcut, hotkeyForEventMatching, sendShortcutParts } from "../../lib/platform";
import { useRuntimePlatform } from "../../hooks/useRuntimePlatform";
import { matchesHotkey } from "../../lib/hotkey";

const LANGUAGE_OPTIONS = [
  { id: "auto", label: "Auto-detect" },
  { id: "pt-BR", label: "Português (BR)" },
  { id: "en-US", label: "English (US)" },
  { id: "es-ES", label: "Español" },
  { id: "custom", label: "Descrever idioma…" },
] as const;

interface Props {
  hotkey: string;
  displayText: string;
  listening: boolean;
  processing: boolean;
  aiResponse: string | null;
  error: string | null;
  toast?: { kind: "success" | "error"; message: string } | null;
  showLanguageControls?: boolean;
  languageMode: string;
  languageCustom: string;
  onLanguageModeChange: (mode: string) => void;
  onLanguageCustomChange: (text: string) => void;
  onToggleRecording: () => void;
  onCancel: () => void;
}

export function TranscriptionTestPanel({
  hotkey,
  displayText,
  listening,
  processing,
  aiResponse,
  error,
  toast = null,
  showLanguageControls = true,
  languageMode,
  languageCustom,
  onLanguageModeChange,
  onLanguageCustomChange,
  onToggleRecording,
  onCancel,
}: Props) {
  const platform = useRuntimePlatform();
  const level = useMicrophoneLevel(listening);
  const [animTick, setAnimTick] = useState(0);
  const shortcut = sendShortcutParts(hotkey, platform);
  const sendLabel = formatSendShortcut(hotkey, platform);
  const recordHotkey = hotkeyForEventMatching("Ctrl+D", platform);

  useEffect(() => {
    if (!listening) return;
    let id = 0;
    const loop = () => {
      setAnimTick((t) => t + 1);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [listening]);

  useEffect(() => {
    const unlisten = listen("send-transcript-hotkey", () => {
      onToggleRecording();
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [onToggleRecording]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!matchesHotkey(e, recordHotkey)) return;
      e.preventDefault();
      onToggleRecording();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggleRecording, recordHotkey]);

  const bars = Array.from({ length: 32 }, (_, i) => {
    const phase = (i / 32) * Math.PI * 2;
    const wave = listening
      ? 0.25 + level * 0.75 * (0.5 + 0.5 * Math.sin(phase + animTick * 0.12))
      : 0.15;
    return Math.min(1, wave);
  });

  return (
    <aside className="transcription-test-panel" data-testid="transcription-test-panel">
      <div className="transcription-test-visual">
        <div className="transcription-waveform" aria-hidden="true">
          {bars.map((h, i) => (
            <span
              key={i}
              className="transcription-wave-bar"
              style={{ transform: `scaleY(${0.35 + h * 0.9})` }}
            />
          ))}
        </div>
        <button
          type="button"
          className={`transcription-mic-btn ${listening ? "active" : ""}`}
          onClick={onToggleRecording}
          aria-label={listening ? "Parar gravação" : "Iniciar gravação"}
          data-testid="btn-transcription-mic"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V19H9v2h6v-2h-2v-1.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>
        {toast && (
          <div
            className={
              toast.kind === "error"
                ? "transcription-toast transcription-toast--error"
                : "transcription-toast transcription-toast--success"
            }
            role={toast.kind === "error" ? "alert" : "status"}
            data-testid="setup-ai-toast"
          >
            {toast.message}
          </div>
        )}
      </div>

      <div className="transcription-test-body" data-testid="transcription-live-text">
        {displayText || (
          <span className="transcription-placeholder">
            A transcrição aparece aqui em tempo real…
          </span>
        )}
      </div>

      {processing && (
        <AiTypingIndicator label="Enviando para a IA" testId="setup-ai-typing" />
      )}

      {aiResponse && !processing && (
        <div className="transcription-ai-response" data-testid="setup-ai-response">
          <p className="transcription-ai-label">Resposta da IA</p>
          <p>{aiResponse}</p>
        </div>
      )}

      {error && (
        <p className="transcription-test-error" role="alert">
          {error}
        </p>
      )}

      <footer className="transcription-test-footer">
        <span className="transcription-shortcut-hint" data-testid="shortcut-hint">
          <kbd>{shortcut.mod}</kbd>
          <span>+</span>
          <kbd>{shortcut.key}</kbd>
          <span className="hint-text">
            {listening ? "para enviar" : "para gravar"}
          </span>
        </span>

        {showLanguageControls && (
          <div className="transcription-lang-wrap">
            <select
              className="transcription-lang-select"
              value={languageMode}
              onChange={(e) => onLanguageModeChange(e.target.value)}
              data-testid="transcription-language"
              disabled={listening || processing}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {languageMode === "custom" && (
              <input
                className="transcription-lang-custom"
                placeholder="Ex.: português do Brasil"
                value={languageCustom}
                onChange={(e) => onLanguageCustomChange(e.target.value)}
                data-testid="transcription-language-custom"
              />
            )}
            {languageMode === "auto" && <span className="lang-live-dot" title="Auto" />}
          </div>
        )}

        <button
          type="button"
          className="btn-ghost"
          onClick={onCancel}
          data-testid="btn-clear-setup-test"
        >
          Limpar
        </button>
      </footer>

      <p className="transcription-test-footnote">
        Atalho global no {platform.displayName}: <strong>{sendLabel}</strong>
      </p>
    </aside>
  );
}
