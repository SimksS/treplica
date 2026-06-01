import { useCallback, useEffect, useRef, useState } from "react";
import { AiTypingIndicator } from "../../components/AiTypingIndicator";
import { IconChevronDown, IconChevronUp, IconMic, IconMicOff } from "../../components/layout/Icons";
import { useCloudTranscription } from "../../hooks/useCloudTranscription";
import { useGuidanceHotkey } from "../../hooks/useGuidanceHotkey";
import { useMicrophoneLevel } from "../../hooks/useMicrophoneStream";
import { useNativeMicrophone } from "../../hooks/useNativeMicrophone";
import { useSnapshotMonitor } from "../../hooks/useSnapshotMonitor";
import { speechRecognitionSupported } from "../../hooks/useSpeechRecognition";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import { formatSendShortcut } from "../../lib/platform";
import { useRuntimePlatform } from "../../hooks/useRuntimePlatform";
import { isTauriRuntime, useTauriListen } from "../../lib/tauriEvents";
import { LiveSpeechCapture } from "../live-session/LiveSpeechCapture";
import { OverlaySystemAudioControls } from "./OverlaySystemAudioControls";
import { LiveSpeechSummary } from "../live-session/LiveSpeechSummary";
import { useLiveSpeechControls } from "../../hooks/useLiveSpeechControls";
import { OverlayTranslationPane } from "./OverlayTranslationPane";
import type { useLiveSession } from "../live-session/useLiveSession";
import type {
  MicOverlayStatusPayload,
  SystemAudioOverlayStatusPayload,
} from "../../lib/types";
import { OverlayGuidanceStack, suggestionToGuidanceEntry, type OverlayGuidanceEntry } from "./OverlayGuidanceStack";
import { OverlayTranscriptPane } from "./OverlayTranscriptPane";

type LiveSession = ReturnType<typeof useLiveSession>;

interface Props {
  session: LiveSession;
  guidanceHotkey?: string;
  onOpenMain?: () => void;
}

export function OverlayLiveWorkspace({
  session,
  guidanceHotkey = "Ctrl+Shift+O",
  onOpenMain,
}: Props) {
  const platform = useRuntimePlatform();
  const [guidanceStack, setGuidanceStack] = useState<OverlayGuidanceEntry[]>([]);
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem("treplica_overlay_compact") !== "false";
    } catch {
      return true;
    }
  });
  const [speechLangCustom, setSpeechLangCustom] = useState<string | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [animTick, setAnimTick] = useState(0);
  const [systemAudioLevel, setSystemAudioLevel] = useState(0);
  const [systemAudioSharing, setSystemAudioSharing] = useState(false);
  const [cloudMicLevel, setCloudMicLevel] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem("treplica_overlay_compact", compact ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [compact]);

  const cloudStt = useCloudTranscription();
  const snapshotMonitor = useSnapshotMonitor(session.sessionId);
  const speech = useLiveSpeechControls(session);

  const webSpeechOk = speechRecognitionSupported();
  const canUseSystemStt = cloudStt.loaded && cloudStt.usable;
  // In transcription mode, prefer Web Speech API for mic: real-time, no VAD cutoff, no hallucinations.
  // In translation mode, force cloud STT so mic uses the same pipeline as system audio:
  //   audio → Whisper STT → ingestSystemAudioChunk → auto-translate.
  // This ensures "o fluxo deve ser sempre o mesmo" for both capture sources.
  const micUsesCloudStt = (!webSpeechOk || speech.speechMode === "translation") && canUseSystemStt;
  const useWebSpeechFallback = cloudStt.loaded && !cloudStt.usable && webSpeechOk;

  useEffect(() => {
    if (!session.sessionId) return;
    void api.setOverlaySystemAudioCaptureActive(false);
  }, [session.sessionId]);

  const requestGuidanceCb = useCallback(() => {
    void session.requestGuidance();
  }, [session]);

  useGuidanceHotkey(
    guidanceHotkey,
    requestGuidanceCb,
    Boolean(session.sessionId) && (session.status === "listening" || session.status === "paused"),
  );

  const pushGuidance = useCallback((entry: OverlayGuidanceEntry) => {
    setGuidanceStack((prev) => {
      if (prev.some((e) => e.id === entry.id)) return prev;
      return [...prev, entry];
    });
  }, []);

  const dismissGuidance = useCallback((id: string) => {
    setGuidanceStack((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const seenGuidanceRef = useRef(new Set<string>());
  const guidanceInitRef = useRef(false);

  useEffect(() => {
    if (!guidanceInitRef.current) {
      for (const s of session.suggestions) {
        seenGuidanceRef.current.add(s.id);
      }
      guidanceInitRef.current = true;
      return;
    }
    for (const s of session.suggestions) {
      if (seenGuidanceRef.current.has(s.id)) continue;
      seenGuidanceRef.current.add(s.id);
      pushGuidance(suggestionToGuidanceEntry(s));
    }
  }, [session.suggestions, pushGuidance]);

  useEffect(() => {
    void (async () => {
      try {
        const onboarding = unwrap(await api.getOnboardingState());
        setSpeechLangCustom(onboarding.transcription_language_custom ?? null);
        const mode = onboarding.transcription_language_mode;
        if (mode === "auto") {
          speech.setSourceLanguage("auto");
        } else if (onboarding.transcription_language_custom) {
          speech.setSourceLanguage(onboarding.transcription_language_custom.split("-")[0] ?? mode);
        } else {
          speech.setSourceLanguage(mode.split("-")[0] ?? "auto");
        }
      } catch {
        /* defaults */
      }
    })();
  }, []);

  useEffect(() => {
    if (session.sessionId) {
      cloudStt.resetSuspension();
      void cloudStt.refresh();
    }
  }, [session.sessionId, cloudStt.refresh, cloudStt.resetSuspension]);

  const handleSnapshot = async () => {
    if (!session.sessionId) return;
    setSnapshotBusy(true);
    try {
      const dataUrl = await api.captureScreenSnapshot({
        sessionId: session.sessionId,
        monitorId: snapshotMonitor.selectedId ?? undefined,
      });
      const update = await session.analyzeImage(dataUrl, "screenshot");
      if (update) {
        seenGuidanceRef.current.add(update.new_suggestion.id);
        pushGuidance({
          id: update.new_suggestion.id,
          title: "Análise visual",
          body: update.new_suggestion.text,
          kind: "snapshot",
          imageDataUrl: dataUrl,
        });
      }
    } catch (e) {
      session.reportError(e instanceof Error ? e.message : String(e));
    } finally {
      setSnapshotBusy(false);
    }
  };

  const sessionListening = session.status === "listening";
  const sessionActive = sessionListening || session.status === "paused";
  const captureActive = sessionListening && speech.captureReady;
  const micMeterActive = sessionListening && captureActive && !micMuted;
  const fallbackMicLevel = useMicrophoneLevel(
    micMeterActive && cloudStt.loaded && !micUsesCloudStt,
  );
  const micLevel = micUsesCloudStt ? cloudMicLevel : fallbackMicLevel;

  useEffect(() => {
    if (!micMeterActive || !micUsesCloudStt) {
      setCloudMicLevel(0);
    }
  }, [micMeterActive, micUsesCloudStt]);

  // Native (Rust) mic capture for the cloud-STT path. Runs on a backend thread,
  // so VAD/STT keep working while this webview is backgrounded behind the
  // overlay — unlike the browser MediaRecorder bridge, which froze there.
  const nativeMic = useNativeMicrophone({
    sessionId: session.sessionId,
    active: captureActive && micUsesCloudStt,
    sourceLanguage: speech.sourceLanguage,
    captureOwner: "stealth",
    autoStart: true,
    muted: micMuted,
    onLevel: setCloudMicLevel,
    onInterim: session.setMicInterim,
    onError: (msg) => {
      session.clearMicInterim();
      session.reportError(msg);
    },
  });
  // Only use the legacy webview bridge when native mic capture is unavailable.
  const useWebviewMicBridge =
    micUsesCloudStt && nativeMic.supportResolved && !nativeMic.supported;

  useEffect(() => {
    if (!sessionListening) return;
    let id = 0;
    const loop = () => {
      setAnimTick((t) => t + 1);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [sessionListening]);

  useTauriListen<SystemAudioOverlayStatusPayload>(
    "system-audio-overlay-status",
    (payload) => {
      setSystemAudioLevel(payload.audio_level ?? 0);
      setSystemAudioSharing(Boolean(payload.sharing));
    },
  );

  useTauriListen<MicOverlayStatusPayload>("mic-overlay-status", (payload) => {
    setCloudMicLevel(payload.audio_level ?? 0);
    if (payload.interim) {
      session.setMicInterim(payload.interim);
    }
    if (payload.error) {
      session.clearMicInterim();
      session.reportError(payload.error);
      cloudStt.suspend(payload.error);
    }
  });

  useEffect(() => {
    const sid = session.sessionId;
    if (
      !isTauriRuntime() ||
      !sid ||
      !captureActive ||
      !useWebviewMicBridge
    ) {
      if (sid) {
        void api.microphoneBridge({ action: "stop", sessionId: sid });
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      const res = await api.microphoneBridge({
        action: "start",
        sessionId: sid,
        sourceLanguage: speech.sourceLanguage,
        muted: micMuted,
        withSystemAudio: canUseSystemStt,
      });
      if (!cancelled && !res.ok) {
        session.reportError(
          res.error?.message ?? "Não foi possível iniciar o microfone na sessão.",
        );
      }
    })();

    return () => {
      cancelled = true;
      void api.microphoneBridge({ action: "stop", sessionId: sid });
    };
  }, [
    session.sessionId,
    captureActive,
    useWebviewMicBridge,
    speech.sourceLanguage,
    micMuted,
    canUseSystemStt,
    session.reportError,
  ]);

  const waveBars = (level: number) =>
    Array.from({ length: 14 }, (_, i) => {
      const phase = (i / 14) * Math.PI * 2;
      const wave = 0.18 + level * 0.82 * (0.5 + 0.5 * Math.sin(phase + animTick * 0.12));
      return Math.min(1, wave);
    });

  return (
    <div
      className={`stealth-overlay-workspace${compact ? " overlay-compact" : ""}`}
      data-testid="overlay-live-workspace"
    >
      {(session.guidanceTyping || session.visionTyping) && (
        <div className="overlay-guidance-pending" data-testid="overlay-guidance-pending" role="status">
          <AiTypingIndicator
            label={
              session.visionTyping
                ? "Analisando imagem e contexto da conversa"
                : "Analisando contexto e gerando orientação"
            }
          />
        </div>
      )}

      {/* Toolbar primária — sempre visível */}
      <div className="stealth-toolbar">
        {!session.sessionId && (
          <button
            type="button"
            className="stealth-btn stealth-btn--primary"
            disabled={session.loading}
            onClick={() => void session.createAndStart()}
            data-testid="overlay-btn-start"
          >
            Iniciar sessão
          </button>
        )}
        {session.sessionId && sessionListening && (
          <button type="button" className="stealth-btn" onClick={() => void session.pause()} data-testid="overlay-btn-pause">
            Pausar
          </button>
        )}
        {session.sessionId && session.status === "paused" && (
          <button type="button" className="stealth-btn" onClick={() => void session.resume()} data-testid="overlay-btn-resume">
            Retomar
          </button>
        )}
        {session.sessionId && sessionActive && (
          <button
            type="button"
            className="stealth-btn stealth-btn--primary"
            disabled={session.guidanceTyping || session.visionTyping}
            onClick={() => void session.requestGuidance()}
            data-testid="overlay-request-guidance"
          >
            {session.guidanceTyping ? "Orientação…" : "Orientação"}
          </button>
        )}
        {session.sessionId && (
          <button
            type="button"
            className="stealth-icon-btn"
            onClick={() => setMicMuted((m) => !m)}
            data-testid="overlay-mic-toggle"
            title={micMuted ? "Microfone: desligado" : "Microfone: ligado"}
          >
            {micMuted ? <IconMicOff size={15} /> : <IconMic size={15} />}
          </button>
        )}
        <span className="stealth-toolbar-spacer" />
        <button
          type="button"
          className="stealth-icon-btn"
          onClick={() => setCompact((c) => !c)}
          data-testid="overlay-toggle-compact"
          title={compact ? "Expandir" : "Recolher"}
        >
          {compact ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
        </button>
      </div>

      {/* Toolbar secundária — somente no modo completo */}
      {!compact && (
        <div className="stealth-toolbar stealth-toolbar--secondary">
          {session.sessionId && sessionActive && (
            <>
              {snapshotMonitor.showPicker && (
                <label className="stealth-monitor-picker">
                  <span className="stealth-monitor-picker-label">Capturar</span>
                  <select
                    className="stealth-monitor-select"
                    value={snapshotMonitor.selectedId ?? ""}
                    disabled={snapshotBusy || session.visionTyping || snapshotMonitor.loading}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (!Number.isNaN(id)) void snapshotMonitor.selectMonitor(id);
                    }}
                    data-testid="overlay-snapshot-monitor"
                    aria-label="Tela para snapshot"
                  >
                    {snapshotMonitor.monitors.map((m, i) => (
                      <option key={m.id} value={m.id}>{snapshotMonitor.labels[i]}</option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                className="stealth-btn"
                disabled={snapshotBusy || session.visionTyping || snapshotMonitor.loading || snapshotMonitor.selectedId == null}
                onClick={() => void handleSnapshot()}
                data-testid="overlay-snapshot"
              >
                {snapshotBusy || session.visionTyping ? "Analisando…" : "Snapshot"}
              </button>
              <button type="button" className="stealth-btn" onClick={() => void session.end()} data-testid="overlay-btn-end">
                Encerrar
              </button>
            </>
          )}
          {onOpenMain && (
            <button type="button" className="stealth-btn" onClick={onOpenMain} data-testid="overlay-focus-main">
              Abrir app
            </button>
          )}
          {session.sessionId && (
            <div className="stealth-audio-indicators" data-testid="overlay-audio-indicators">
              <div className={`stealth-wave ${micMuted ? "muted" : ""}`} aria-label="Microfone">
                {waveBars(micMuted ? 0 : micLevel).map((h, i) => (
                  <span key={i} className="stealth-wave-bar" style={{ transform: `scaleY(${0.35 + h * 0.9})` }} />
                ))}
              </div>
              <div className={`stealth-wave ${systemAudioSharing ? "" : "muted"}`} aria-label="Áudio do sistema">
                {waveBars(systemAudioSharing ? systemAudioLevel : 0).map((h, i) => (
                  <span key={i} className="stealth-wave-bar" style={{ transform: `scaleY(${0.35 + h * 0.9})` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info auxiliar — oculta no modo compacto */}
      <div className={compact ? "overlay-aux overlay-aux--hidden" : "overlay-aux"}>
        {session.sessionId && (
          <LiveSpeechSummary
            compact
            mode={speech.speechMode}
            sourceLanguage={speech.sourceLanguage}
            targetLanguage={session.targetLanguage}
          />
        )}
        {micUsesCloudStt && session.sessionId && (
          <p className="stealth-hint" data-testid="overlay-stt-cloud-mic">
            Microfone + áudio do sistema via <strong>{cloudStt.sttModel ?? "Whisper"}</strong> ({cloudStt.providerDisplayName ?? "nuvem"}).
          </p>
        )}
        {!micUsesCloudStt && canUseSystemStt && webSpeechOk && session.sessionId && (
          <p className="stealth-hint" data-testid="overlay-stt-webspeech-mic">
            Microfone via <strong>Web Speech</strong> · áudio do sistema via <strong>{cloudStt.sttModel ?? "Whisper"}</strong>.
          </p>
        )}
        {useWebSpeechFallback && session.sessionId && (
          <p className="stealth-hint" data-testid="overlay-stt-fallback">
            Microfone via <strong>Web Speech</strong>. Configure Groq ou OpenAI em Provedores para transcrição na nuvem e áudio do sistema.
          </p>
        )}
        {platform.os === "macos" && !micUsesCloudStt && session.sessionId && (
          <p className="stealth-hint" data-testid="overlay-stt-macos-no-provider" role="alert">
            No <strong>macOS</strong>, a transcrição do microfone exige um provedor na nuvem (Web Speech não funciona aqui). Configure <strong>Groq</strong> ou <strong>OpenAI</strong> (Whisper) em Provedores.
          </p>
        )}
        <p className="stealth-hint">
          Atalho <strong>{formatSendShortcut(guidanceHotkey, platform)}</strong> analisa os últimos trechos da conversa e gera orientação contextual.
        </p>
      </div>

      {speech.speechMode !== "translation" && (
        <OverlayTranscriptPane segments={session.transcripts} interimText={session.interimTranscript} />
      )}
      {speech.speechMode === "translation" && (
        <OverlayTranslationPane
          translations={session.translations}
          transcripts={session.transcripts}
          showOriginal={false}
          interimText={session.translationTyping ? "Traduzindo trecho…" : undefined}
        />
      )}

      {(session.guidanceTyping || session.visionTyping || session.translationTyping) && (
        <AiTypingIndicator
          label={
            session.visionTyping ? "Analisando imagem" : session.guidanceTyping ? "Gerando orientação" : "Traduzindo"
          }
        />
      )}

      {session.translationError && (
        <p className="stealth-error" role="alert">Tradução: {session.translationError}</p>
      )}
      {session.error && (
        <p className="stealth-error" role="alert" data-testid="overlay-session-error">{session.error}</p>
      )}

      {/* Captura de áudio — funcional mesmo quando visualmente ocultos */}
      {session.sessionId && captureActive && !micUsesCloudStt && (
        <div className="overlay-aux overlay-aux--hidden">
          <LiveSpeechCapture
            sessionId={session.sessionId}
            status={session.status}
            sourceLanguage={speech.sourceLanguage}
            languageCustom={speechLangCustom}
            fallbackMode={useWebSpeechFallback || !cloudStt.usable}
            enabled={!micMuted}
            captureOwner="stealth"
            onInterim={session.setMicInterim}
            onIngested={session.clearMicInterim}
            onError={(msg) => {
              session.clearMicInterim();
              session.reportError(msg);
            }}
          />
        </div>
      )}
      {session.sessionId && captureActive && canUseSystemStt && (
        <OverlaySystemAudioControls
          sessionId={session.sessionId}
          status={session.status}
          sourceLanguage={speech.sourceLanguage}
          autoStart
          compact={compact}
          onInterim={session.setSystemInterim}
          onCloudSttFailed={(msg) => { cloudStt.suspend(msg); session.reportError(msg); }}
          onError={(msg) => { session.clearSystemInterim(); session.reportError(msg); }}
        />
      )}

      <OverlayGuidanceStack entries={guidanceStack} onDismiss={dismissGuidance} />
    </div>
  );
}
