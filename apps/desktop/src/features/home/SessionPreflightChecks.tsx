import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../../lib/tauriClient";
import { formatCaptureMonitorLabel } from "../../lib/captureMonitor";
import { audioLevelPercent } from "../../lib/audioMeter";
import { useMicrophonePermission } from "../../hooks/useMicrophoneStream";
import { useRuntimePlatform } from "../../hooks/useRuntimePlatform";
import { setupScreenPermissionCopy } from "../../lib/platform";
import { isTauriRuntime } from "../../lib/tauriEvents";
import { systemAudioCaptureSupported } from "../../hooks/useSystemAudioCapture";
import {
  isPreflightRecordingQualityOk,
  isPreflightRecordingUsable,
  recordStreamWithMeter,
} from "../../lib/preflightAudioTest";
import { PreflightAudioPreview } from "./PreflightAudioPreview";

const RECORDING_MS = 4000;

export interface SessionPreflightStatus {
  micGranted: boolean;
  micVerified: boolean;
  systemAudioVerified: boolean;
  screenCaptureVerified: boolean;
  ready: boolean;
}

export type SessionPreflightPanel = "mic" | "system" | "screen" | "all";

interface Props {
  onStatusChange: (status: SessionPreflightStatus) => void;
  activePanel?: SessionPreflightPanel;
  showHeader?: boolean;
}

export function SessionPreflightChecks({
  onStatusChange,
  activePanel = "all",
  showHeader = true,
}: Props) {
  const platform = useRuntimePlatform();
  const screenCopy = setupScreenPermissionCopy(platform);
  const mic = useMicrophonePermission();
  const [micRecording, setMicRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micPeak, setMicPeak] = useState(0);
  const [micBlobSize, setMicBlobSize] = useState(0);
  const [micPreviewUrl, setMicPreviewUrl] = useState<string | null>(null);
  const [micRecordError, setMicRecordError] = useState<string | null>(null);
  const micRevokeRef = useRef<(() => void) | null>(null);

  const [nativeSystemAudio, setNativeSystemAudio] = useState(false);
  const [systemRecording, setSystemRecording] = useState(false);
  const [systemLevel, setSystemLevel] = useState(0);
  const [systemPeak, setSystemPeak] = useState(0);
  const [systemBlobSize, setSystemBlobSize] = useState(0);
  const [systemPreviewUrl, setSystemPreviewUrl] = useState<string | null>(null);
  const [systemVerified, setSystemVerified] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const systemRevokeRef = useRef<(() => void) | null>(null);

  const [captureMonitors, setCaptureMonitors] = useState<
    { id: number; label: string }[]
  >([]);
  const [captureMonitorId, setCaptureMonitorId] = useState<number | null>(null);
  const [captureMonitorLoading, setCaptureMonitorLoading] = useState(false);
  const [screenTesting, setScreenTesting] = useState(false);
  const [screenVerified, setScreenVerified] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenPreview, setScreenPreview] = useState<string | null>(null);

  const showMic = activePanel === "all" || activePanel === "mic";
  const showSystem = activePanel === "all" || activePanel === "system";
  const showScreen = activePanel === "all" || activePanel === "screen";

  const clearMicPreview = useCallback(() => {
    micRevokeRef.current?.();
    micRevokeRef.current = null;
    setMicPreviewUrl(null);
    setMicPeak(0);
    setMicBlobSize(0);
    setMicLevel(0);
  }, []);

  const clearSystemPreview = useCallback(() => {
    systemRevokeRef.current?.();
    systemRevokeRef.current = null;
    setSystemPreviewUrl(null);
    setSystemPeak(0);
    setSystemBlobSize(0);
    setSystemLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      micRevokeRef.current?.();
      systemRevokeRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!showScreen) return;
    let cancelled = false;
    void (async () => {
      setCaptureMonitorLoading(true);
      try {
        const list = await api.listCaptureMonitors();
        if (cancelled) return;
        setCaptureMonitors(
          list.map((monitor, index) => ({
            id: monitor.id,
            label: formatCaptureMonitorLabel(monitor, index),
          })),
        );
        setCaptureMonitorId(await api.getSnapshotMonitor(null));
      } catch {
        if (!cancelled) {
          setCaptureMonitors([]);
          setCaptureMonitorId(null);
        }
      } finally {
        if (!cancelled) setCaptureMonitorLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showScreen]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setScreenVerified(true);
      setSystemVerified(true);
      return;
    }
    void api.nativeSystemAudioSupported().then(setNativeSystemAudio);
  }, []);

  const requireSignal = isTauriRuntime();
  const micOk =
    mic.status === "granted" &&
    Boolean(micPreviewUrl) &&
    isPreflightRecordingQualityOk(micBlobSize, micPeak, requireSignal);

  const systemOk =
    systemVerified ||
    (Boolean(systemPreviewUrl) &&
      isPreflightRecordingQualityOk(
        systemBlobSize,
        systemPeak,
        requireSignal,
      ));

  const reportStatus = useCallback(() => {
    const micGranted = mic.status === "granted";
    const screenOk = screenVerified;
    const ready = systemOk && screenOk;
    onStatusChange({
      micGranted,
      micVerified: micOk,
      systemAudioVerified: systemOk,
      screenCaptureVerified: screenOk,
      ready,
    });
  }, [mic.status, micOk, systemOk, screenVerified, onStatusChange]);

  useEffect(() => {
    reportStatus();
  }, [reportStatus]);

  const testMicrophone = async () => {
    setMicRecordError(null);
    if (mic.status !== "granted") {
      const ok = await mic.request();
      if (!ok) return;
    }
    clearMicPreview();
    setMicRecording(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const result = await recordStreamWithMeter(
        stream,
        RECORDING_MS,
        setMicLevel,
      );
      micRevokeRef.current = result.revoke;
      setMicPreviewUrl(result.blobUrl);
      setMicPeak(result.peakLevel);
      setMicBlobSize(result.blob.size);
      if (
        !isPreflightRecordingUsable(result.blob, result.peakLevel, requireSignal)
      ) {
        setMicRecordError(
          requireSignal
            ? "Gravação muito baixa ou vazia. Fale mais perto do microfone e grave de novo."
            : "Gravação vazia. Tente novamente.",
        );
      }
    } catch (e) {
      setMicRecordError(e instanceof Error ? e.message : String(e));
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      setMicRecording(false);
      setMicLevel(0);
    }
  };

  const testSystemAudio = async () => {
    if (nativeSystemAudio) {
      setSystemVerified(true);
      setSystemError(null);
      return;
    }
    if (!systemAudioCaptureSupported()) {
      setSystemError("Captura de áudio do sistema não disponível neste ambiente.");
      return;
    }
    clearSystemPreview();
    setSystemVerified(false);
    setSystemRecording(true);
    setSystemError(null);
    let stream: MediaStream | null = null;
    let displayStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 320 }, height: { ideal: 180 } },
        audio: true,
        systemAudio: "include",
      } as DisplayMediaStreamOptions);
      displayStream.getVideoTracks().forEach((track) => track.stop());
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        setSystemError(
          "Nenhuma faixa de áudio. Marque «Compartilhar áudio do sistema» no diálogo.",
        );
        displayStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = new MediaStream(audioTracks);
      const result = await recordStreamWithMeter(
        stream,
        RECORDING_MS,
        setSystemLevel,
      );
      systemRevokeRef.current = result.revoke;
      setSystemPreviewUrl(result.blobUrl);
      setSystemPeak(result.peakLevel);
      setSystemBlobSize(result.blob.size);
      if (
        !isPreflightRecordingUsable(result.blob, result.peakLevel, requireSignal)
      ) {
        setSystemError(
          platform.os === "windows"
            ? "Sem áudio na gravação. Marque o áudio do sistema no diálogo e reproduza som no PC."
            : "Sem áudio na gravação. Reproduza som no PC durante os 4 segundos.",
        );
      }
    } catch (e) {
      setSystemError(e instanceof Error ? e.message : String(e));
    } finally {
      displayStream?.getTracks().forEach((track) => track.stop());
      stream?.getTracks().forEach((track) => track.stop());
      setSystemRecording(false);
      setSystemLevel(0);
    }
  };

  const testScreenCapture = async () => {
    setScreenTesting(true);
    setScreenError(null);
    setScreenPreview(null);
    setScreenVerified(false);
    try {
      if (captureMonitorId != null) {
        await api.setSnapshotMonitor(captureMonitorId, null);
      }
      const dataUrl = await api.captureScreenSnapshot({
        monitorId: captureMonitorId ?? undefined,
        sessionId: null,
      });
      if (dataUrl && dataUrl.length > 32) {
        setScreenVerified(true);
        setScreenPreview(dataUrl);
      } else {
        setScreenError("Captura vazia. Verifique permissões de tela.");
      }
    } catch (e) {
      setScreenError(e instanceof Error ? e.message : String(e));
    } finally {
      setScreenTesting(false);
    }
  };

  const micLevelPct = audioLevelPercent(micRecording ? micLevel : micPeak);
  const systemLevelPct = audioLevelPercent(
    systemRecording ? systemLevel : systemPeak,
  );

  return (
    <section
      className={`session-preflight session-preflight--${activePanel}`}
      data-testid="session-preflight"
      data-panel={activePanel}
    >
      {showHeader && (
        <>
          <p className="card-label">Verificar áudio e captura</p>
          <p className="start-meeting-context-notice" role="note">
            Confirme áudio do sistema e captura de tela antes de iniciar a sessão no
            overlay. O microfone é opcional (pule se só for transcrever o PC ou um vídeo).
            {!isTauriRuntime() && (
              <>
                {" "}
                No navegador (sem app desktop), os testes de sistema e tela não se aplicam.
              </>
            )}
          </p>
        </>
      )}

      <div
        className={
          activePanel === "all"
            ? "session-preflight-grid"
            : "session-preflight-single"
        }
      >
        {showMic && (
          <div className="session-preflight-card">
            <h4 className="session-preflight-title">Microfone (opcional)</h4>
            <p className="card-muted session-preflight-desc">
              {mic.status === "granted"
                ? "Grave alguns segundos e ouça a prévia, ou use Continuar se não for falar."
                : "Opcional — só necessário se você for falar na sessão."}
            </p>
            {(micRecording || micPreviewUrl) && mic.status === "granted" && (
              <div className="system-audio-meter" data-testid="preflight-mic-meter">
                <span>{micRecording ? "Gravando" : "Pico"}</span>
                <div className="system-audio-meter-bar">
                  <div
                    className="system-audio-meter-fill"
                    style={{ width: `${micLevelPct}%` }}
                  />
                </div>
                <span>{micLevelPct}%</span>
              </div>
            )}
            <PreflightAudioPreview
              src={micPreviewUrl}
              testId="preflight-mic-audio-preview"
            />
            {(mic.error || micRecordError) && (
              <p className="form-error" role="alert">
                {micRecordError ?? mic.error}
              </p>
            )}
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={micRecording}
              onClick={() => void testMicrophone()}
              data-testid="btn-preflight-mic"
            >
              {micRecording
                ? `Gravando… ${Math.ceil(RECORDING_MS / 1000)}s`
                : micPreviewUrl
                  ? "Gravar de novo"
                  : "Gravar teste (4s)"}
            </button>
            {micOk && (
              <p className="session-preflight-ok" data-testid="preflight-mic-ok">
                Microfone OK
              </p>
            )}
          </div>
        )}

        {showSystem && (
          <div className="session-preflight-card">
            <h4 className="session-preflight-title">Áudio do sistema</h4>
            <p className="card-muted session-preflight-desc">
              {nativeSystemAudio
                ? "Captura nativa disponível neste sistema (sem compartilhar tela)."
                : "Grave o áudio do sistema por alguns segundos e ouça a prévia."}
            </p>
            {(systemRecording || systemPreviewUrl) && !nativeSystemAudio && (
              <div
                className="system-audio-meter"
                data-testid="preflight-system-meter"
              >
                <span>{systemRecording ? "Gravando" : "Pico"}</span>
                <div className="system-audio-meter-bar">
                  <div
                    className="system-audio-meter-fill"
                    style={{ width: `${systemLevelPct}%` }}
                  />
                </div>
                <span>{systemLevelPct}%</span>
              </div>
            )}
            <PreflightAudioPreview
              src={nativeSystemAudio ? null : systemPreviewUrl}
              testId="preflight-system-audio-preview"
              hint="Ouça a gravação do áudio do sistema."
            />
            {systemError && (
              <p className="form-error" role="alert">
                {systemError}
              </p>
            )}
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={systemRecording}
              onClick={() => void testSystemAudio()}
              data-testid="btn-preflight-system-audio"
            >
              {systemRecording
                ? `Gravando… ${Math.ceil(RECORDING_MS / 1000)}s`
                : nativeSystemAudio
                  ? "Confirmar disponível"
                  : systemPreviewUrl
                    ? "Gravar de novo"
                    : "Gravar teste (4s)"}
            </button>
            {systemOk && (
              <p className="session-preflight-ok" data-testid="preflight-system-ok">
                Áudio do sistema OK
              </p>
            )}
          </div>
        )}

        {showScreen && (
          <div className="session-preflight-card session-preflight-card--screen">
            {activePanel === "all" && (
              <h4 className="session-preflight-title">Captura de tela</h4>
            )}
            <div className="session-preflight-screen-controls">
              <label className="form-field form-field--full">
                <span className="form-field-label">Monitor</span>
                <select
                  value={captureMonitorId ?? ""}
                  disabled={captureMonitorLoading || screenTesting}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCaptureMonitorId(value ? Number(value) : null);
                    setScreenVerified(false);
                    setScreenPreview(null);
                  }}
                  data-testid="preflight-capture-monitor"
                >
                  <option value="">Automático</option>
                  {captureMonitors.map((monitor) => (
                    <option key={monitor.id} value={monitor.id}>
                      {monitor.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-primary btn-sm session-preflight-capture-btn"
                disabled={screenTesting}
                onClick={() => void testScreenCapture()}
                data-testid="btn-preflight-screen"
              >
                {screenTesting ? "Capturando…" : "Testar captura"}
              </button>
            </div>
            <div
              className="session-preflight-preview-frame"
              data-testid="preflight-screen-preview-frame"
            >
              {screenPreview ? (
                <img
                  src={screenPreview}
                  alt="Prévia da captura de tela"
                  className="session-preflight-preview"
                  data-testid="preflight-screen-preview"
                />
              ) : (
                <p className="session-preflight-preview-placeholder">
                  A prévia da captura aparece abaixo após o teste.
                </p>
              )}
            </div>
            <p className="card-muted session-preflight-hint">{screenCopy.settingsHint}</p>
            {screenError && (
              <p className="form-error" role="alert">
                {screenError}
              </p>
            )}
            {screenVerified && (
              <p className="session-preflight-ok" data-testid="preflight-screen-ok">
                Captura de tela OK
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        .session-preflight { margin-top: 0; }
        .session-preflight-single {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }
        .session-preflight-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        @media (min-width: 640px) {
          .session-preflight-grid {
            grid-template-columns: 1fr 1fr;
          }
          .session-preflight-card--wide,
          .session-preflight-card--screen {
            grid-column: 1 / -1;
          }
        }
        .session-preflight-card {
          background: var(--color-surface-elevated, rgba(255,255,255,0.04));
          border: 1px solid var(--color-border-subtle, rgba(255,255,255,0.08));
          border-radius: var(--radius-md, 12px);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
        }
        .session-preflight-card--screen {
          flex: 0 1 auto;
        }
        .session-preflight--screen .session-preflight-card--screen {
          flex: none;
          padding: 0;
          background: transparent;
          border: none;
          gap: 10px;
        }
        .session-preflight-title {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text, #e8ecf1);
        }
        .session-preflight-desc,
        .session-preflight-hint {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.4;
        }
        .session-preflight-ok {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--color-success, #3dd68c);
          font-weight: 500;
        }
        .session-preflight-preview-frame {
          flex: 0 0 auto;
          min-height: 96px;
          max-height: 128px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--color-border-subtle, rgba(255,255,255,0.08));
          background: rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .session-preflight--screen .session-preflight-preview-frame {
          min-height: 80px;
          max-height: 120px;
        }
        .session-preflight-preview-placeholder {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--color-text-muted, #8b9cb3);
          text-align: center;
          padding: 12px;
        }
        .session-preflight-preview {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 4px;
        }
        .session-preflight-screen-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }
        .session-preflight--screen .session-preflight-screen-controls {
          flex-direction: column;
          align-items: stretch;
        }
        .session-preflight-screen-controls .form-field {
          flex: 1;
          min-width: 160px;
          margin: 0;
        }
        .session-preflight--screen .session-preflight-screen-controls .form-field {
          min-width: 0;
          width: 100%;
        }
        .session-preflight-capture-btn {
          align-self: flex-start;
        }
        .session-preflight--screen .session-preflight-capture-btn {
          width: 100%;
          align-self: stretch;
        }
        .session-preflight--screen .session-preflight-hint {
          font-size: 0.75rem;
        }
        .btn-sm {
          width: auto;
          align-self: flex-start;
          font-size: 0.8125rem;
          padding: 6px 12px;
        }
      `}</style>
    </section>
  );
}
