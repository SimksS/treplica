import { useSystemAudioCapture } from "../../hooks/useSystemAudioCapture";
import { audioLevelPercent } from "../../lib/audioMeter";
import type { SessionStatus } from "../../lib/types";

interface Props {
  sessionId: string | null;
  status: SessionStatus;
  sourceLanguage?: string;
  autoStart?: boolean;
  compact?: boolean;
  onInterim: (text: string) => void;
  onError: (message: string) => void;
  onCloudSttFailed?: (message: string) => void;
}

export function OverlaySystemAudioControls({
  sessionId,
  status,
  sourceLanguage = "auto",
  autoStart = false,
  compact = false,
  onInterim,
  onError,
  onCloudSttFailed,
}: Props) {
  const active = Boolean(sessionId && status === "listening");

  const capture = useSystemAudioCapture({
    sessionId,
    active,
    sourceLanguage,
    captureOwner: "stealth",
    autoStart,
    onInterim,
    onError,
    onCloudSttFailed,
    emitOverlayStatus: true,
  });

  const levelPct = audioLevelPercent(capture.audioLevel);
  const hasSignal = levelPct > 2;
  const native = capture.usesNativeLoopback;
  const waitingNative = capture.loopbackReady && native;
  const systemAudioLabel = compact
    ? capture.sharing
      ? "Parar áudio do sistema"
      : "Ativar áudio do sistema"
    : capture.sharing
      ? "Parar compartilhamento"
      : "Compartilhar tela e ouvir áudio";

  return (
    <div
      className={`system-audio-panel${compact ? " system-audio-panel--compact" : ""}`}
      data-testid="overlay-system-audio-panel"
    >
      {!compact && !capture.loopbackReady && autoStart && active && (
        <p className="stealth-hint" data-testid="system-audio-initializing">
          Iniciando áudio do sistema…
        </p>
      )}
      {!compact && waitingNative ? (
        <p className="stealth-hint" data-testid="system-audio-native-active">
          Áudio do sistema ativo (sem compartilhar tela).
        </p>
      ) : capture.loopbackReady && !capture.sharing ? (
        <button
          type="button"
          className={compact ? "stealth-icon-btn" : "stealth-btn stealth-btn--primary"}
          disabled={!active}
          onClick={() => void capture.startCapture()}
          data-testid="btn-share-system-audio"
          aria-label={systemAudioLabel}
          title={systemAudioLabel}
        >
          {compact ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9v6h4l5 4V5L7 9H3z" />
              <path d="M14 9a4 4 0 0 1 0 6" />
              <path d="M17 6a8 8 0 0 1 0 12" />
            </svg>
          ) : (
            "Compartilhar tela e ouvir áudio"
          )}
        </button>
      ) : capture.loopbackReady && capture.sharing ? (
        <button
          type="button"
          className={compact ? "stealth-icon-btn" : "stealth-btn"}
          onClick={() => capture.stopCapture()}
          data-testid="btn-stop-system-audio"
          aria-label={systemAudioLabel}
          title={systemAudioLabel}
        >
          {compact ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 9h4l5-4v14l-5-4H6z" opacity="0.95" />
              <path
                d="M17 8l3 3m0-3l-3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : (
            "Parar compartilhamento"
          )}
        </button>
      ) : null}

      {!compact && capture.loopbackReady && !native && (
        <p className="stealth-hint" data-testid="system-audio-stealth-hint">
          Escolha <strong>tela inteira</strong> e marque <strong>áudio do sistema</strong> no
          diálogo do Windows.
        </p>
      )}

      {!compact && capture.sharing && (
        <div className="system-audio-meter" data-testid="system-audio-meter">
          <span>Nível</span>
          <div className="system-audio-meter-bar">
            <div
              className="system-audio-meter-fill"
              style={{ width: `${levelPct}%` }}
            />
          </div>
          <span className="system-audio-meter-value">{levelPct}%</span>
        </div>
      )}

      {!compact && capture.sharing && !hasSignal && (
        <p className="stealth-hint" data-testid="system-audio-no-signal">
          {native
            ? "Sem sinal ainda — reproduza áudio no PC."
            : "Sem sinal ainda — marque o áudio do sistema no diálogo do Windows."}
        </p>
      )}

      {!compact && capture.chunksSent > 0 && (
        <p className="stealth-hint" data-testid="system-audio-chunks">
          {capture.chunksSent} trecho(s) transcrito(s)
        </p>
      )}

      {!compact && capture.status === "transcribing" && (
        <p className="stealth-hint">Transcrevendo trecho…</p>
      )}

      {capture.error && (
        <p className="stealth-error" data-testid="system-audio-error" role="alert">
          {capture.error}
        </p>
      )}
    </div>
  );
}
