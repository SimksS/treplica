import type { SessionStatus } from "../../lib/types";

import { useSystemAudioCapture } from "../../hooks/useSystemAudioCapture";
import { audioLevelPercent } from "../../lib/audioMeter";

interface Props {
  sessionId: string | null;
  status: SessionStatus;
  sourceLanguage?: string;
  captureOwner?: "main" | "stealth";
  autoStart?: boolean;
  onStatus: (text: string) => void;
  onError: (message: string) => void;
  onCloudSttFailed?: (message: string, code: string) => void;
}

export function SystemAudioCapture({
  sessionId,
  status,
  sourceLanguage = "auto",
  captureOwner = "main",
  autoStart = false,
  onStatus,
  onError,
  onCloudSttFailed,
}: Props) {
  const active = Boolean(sessionId && status === "listening");
  const capture = useSystemAudioCapture({
    sessionId,
    active,
    sourceLanguage,
    captureOwner,
    autoStart,
    onInterim: onStatus,
    onError,
    onCloudSttFailed,
  });
  if (!capture.supported) {
    return (
      <p className="live-hint" data-testid="system-audio-unsupported">
        Áudio do computador não disponível neste ambiente. Use{" "}
        <code>npm run tauri:dev</code>.
      </p>
    );
  }

  const levelPct = audioLevelPercent(capture.audioLevel);
  const hasSignal = levelPct > 2;
  const native = capture.usesNativeLoopback;
  const waitingNative = capture.loopbackReady && native;

  return (
    <div className="system-audio-panel" data-testid="system-audio-panel">
      {!capture.loopbackReady && autoStart && active && (
        <p className="live-hint" data-testid="system-audio-initializing">
          Iniciando captura de áudio do sistema…
        </p>
      )}
      {waitingNative ? (
        <p className="live-hint" data-testid="system-audio-native-active">
          <strong>Áudio do sistema</strong> capturado automaticamente (sem compartilhar
          tela).
        </p>
      ) : capture.loopbackReady && !capture.sharing ? (
        <button
          type="button"
          className="btn-primary"
          disabled={!active}
          onClick={() => void capture.startCapture()}
          data-testid="btn-share-system-audio"
        >
          Compartilhar tela e ouvir áudio
        </button>
      ) : capture.loopbackReady && capture.sharing ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => capture.stopCapture()}
          data-testid="btn-stop-system-audio"
        >
          Parar compartilhamento
        </button>
      ) : null}

      {capture.sharing && (
        <div className="system-audio-meter" data-testid="system-audio-meter">
          <span>Nível de áudio capturado</span>
          <div className="system-audio-meter-bar">
            <div
              className="system-audio-meter-fill"
              style={{ width: `${levelPct}%` }}
            />
          </div>
          <span className="system-audio-meter-value">{levelPct}%</span>
        </div>
      )}

      {capture.sharing && !hasSignal && (
        <p className="live-hint" data-testid="system-audio-no-signal">
          {native ? (
            <>
              Nenhum sinal ainda — reproduza áudio no computador (vídeo, chamada, música).
            </>
          ) : (
            <>
              Nenhum sinal de áudio ainda. Compartilhe a <strong>tela inteira</strong> com{" "}
              <strong>áudio do sistema</strong> ativado.
            </>
          )}
        </p>
      )}

      {!native && capture.sharing && captureOwner === "stealth" && (
        <p className="live-hint" data-testid="system-audio-stealth-hint">
          Compartilhe a <strong>tela inteira</strong> (não só esta janela). O overlay pode
          aparecer na gravação enquanto o áudio do PC estiver ativo.
        </p>
      )}

      {capture.sharing && hasSignal && capture.chunksSent === 0 && (
        <p className="live-hint" data-testid="system-audio-waiting">
          Áudio detectado — a transcrição envia cada frase após uma pausa no som.
        </p>
      )}

      {capture.chunksSent > 0 && (
        <p className="live-hint" data-testid="system-audio-chunks">
          {capture.chunksSent} trecho(s) transcrito(s)
          {capture.chunksSkipped > 0
            ? ` · ${capture.chunksSkipped} silencioso(s) ignorado(s)`
            : ""}
        </p>
      )}

      {capture.status === "transcribing" && (
        <p className="live-hint">Transcrevendo trecho…</p>
      )}

      {capture.error && (
        <p className="live-error" data-testid="system-audio-error" role="alert">
          {capture.error}
        </p>
      )}

      <style>{`
        .system-audio-panel { display: flex; flex-direction: column; gap: 10px; }
        .system-audio-meter { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; flex-wrap: wrap; }
        .system-audio-meter-bar {
          flex: 1; min-width: 120px; height: 8px; background: var(--color-surface-elevated);
          border-radius: 4px; overflow: hidden;
        }
        .system-audio-meter-fill {
          height: 100%; background: #3dd68c; transition: width 0.1s linear;
        }
        .system-audio-meter-value { color: var(--color-text-muted); min-width: 2.5rem; }
      `}</style>
    </div>
  );
}
