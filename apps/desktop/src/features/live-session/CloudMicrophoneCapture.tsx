import { useCallback, useEffect, useRef } from "react";

import { useCloudAudioStt } from "../../hooks/useCloudAudioStt";
import { buildMicrophoneStreamConstraints } from "../../lib/microphoneConstraints";
import type { SessionStatus } from "../../lib/types";

interface Props {
  sessionId: string | null;
  status: SessionStatus;
  sourceLanguage?: string;
  captureOwner?: "main" | "stealth";
  autoStart?: boolean;
  muted?: boolean;
  /** Disable AEC when system loopback is active (avoids silencing the mic). */
  withSystemAudio?: boolean;
  sttModelLabel?: string;
  /** Reuse capture level for UI meters (avoid a second getUserMedia stream). */
  onAudioLevel?: (level: number) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  onCloudSttFailed?: (message: string, code: string) => void;
}

export function CloudMicrophoneCapture({
  sessionId,
  status,
  sourceLanguage = "auto",
  captureOwner = "main",
  autoStart = false,
  muted = false,
  withSystemAudio = false,
  sttModelLabel,
  onAudioLevel,
  onInterim,
  onError,
  onCloudSttFailed,
}: Props) {
  const active = Boolean(sessionId && status === "listening");

  const acquireStream = useCallback(async () => {
    return navigator.mediaDevices.getUserMedia(
      buildMicrophoneStreamConstraints({ withSystemAudio }),
    );
  }, [withSystemAudio]);

  const capture = useCloudAudioStt({
    sessionId,
    active,
    sourceLanguage,
    captureOwner,
    captureMode: "microphone",
    muted,
    speakerLabel: "Você",
    interimMessage: "Transcrevendo microfone na nuvem…",
    acquireStream,
    onInterim,
    onError,
    onCloudSttFailed,
  });

  const autoStartedRef = useRef(false);

  useEffect(() => {
    onAudioLevel?.(muted ? 0 : capture.audioLevel);
  }, [capture.audioLevel, muted, onAudioLevel]);

  useEffect(() => {
    if (!autoStart || !active) {
      autoStartedRef.current = false;
      return;
    }
    if (autoStartedRef.current || capture.capturing) return;

    let cancelled = false;
    autoStartedRef.current = true;
    void (async () => {
      const ok = await capture.startCapture();
      if (!ok || cancelled) {
        autoStartedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoStart, active, capture.capturing, capture.startCapture]);

  const levelPct = Math.round(capture.audioLevel * 100);
  const hasSignal = capture.audioLevel > 0.02;

  return (
    <div className="cloud-mic-panel" data-testid="cloud-mic-panel">
      <p className="live-hint" data-testid="cloud-mic-engine">
        Microfone via <strong>API na nuvem</strong>
        {sttModelLabel ? ` (${sttModelLabel})` : ""}. Envia cada frase após uma pausa na
        fala.
        {muted ? " · mutado" : ""}
      </p>

      {!capture.capturing && !autoStart && (
        <button
          type="button"
          className="btn-primary"
          disabled={!active}
          onClick={() => void capture.startCapture()}
          data-testid="btn-start-cloud-mic"
        >
          Ativar microfone (nuvem)
        </button>
      )}

      {capture.capturing && (
        <div className="system-audio-meter" data-testid="cloud-mic-meter">
          <span>Nível do microfone</span>
          <div className="system-audio-meter-bar">
            <div
              className="system-audio-meter-fill"
              style={{ width: `${muted ? 0 : levelPct}%` }}
            />
          </div>
          <span className="system-audio-meter-value">{muted ? 0 : levelPct}%</span>
        </div>
      )}

      {capture.capturing && !muted && !hasSignal && (
        <p className="live-hint" data-testid="cloud-mic-no-signal">
          Fale no microfone — aguarde o medidor subir.
        </p>
      )}

      {capture.capturing && muted && (
        <p className="live-hint" data-testid="cloud-mic-muted">
          Microfone mutado — o áudio do sistema continua ativo.
        </p>
      )}

      {capture.chunksSent > 0 && (
        <p className="live-hint" data-testid="cloud-mic-chunks">
          {capture.chunksSent} trecho(s) transcrito(s) na nuvem
        </p>
      )}

      {capture.status === "transcribing" && (
        <p className="live-hint">Transcrevendo trecho…</p>
      )}

      {capture.error && (
        <p className="live-error" data-testid="cloud-mic-error" role="alert">
          {capture.error}
        </p>
      )}
    </div>
  );
}
