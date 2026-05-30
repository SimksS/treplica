import { useCallback, useEffect, useRef, useState } from "react";

import {
  blobHasMediaContainerHeader,
  normalizeMimeForWhisper,
  pickRecorderOptions,
} from "../lib/audioChunk";
import {
  MIN_SEGMENT_MS,
  MIN_STT_INTERVAL_MS,
  shouldMarkSilenceStart,
  SPEECH_LEVEL_THRESHOLD,
  vadSegmentAction,
} from "../lib/speechVad";
import * as api from "../lib/tauriClient";
import { isTauriRuntime } from "../lib/tauriEvents";
import { isRecoverableCloudSttFailure } from "../lib/sttErrors";

const MIN_BLOB_BYTES = 400;
/** Minimum peak level during a segment to send it to Whisper. */
const MIN_SPEECH_PEAK = 0.03;

export type CloudAudioSttStatus = "idle" | "capturing" | "transcribing" | "error";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result;
      if (typeof data !== "string") {
        reject(new Error("falha ao ler áudio"));
        return;
      }
      const base64 = data.split(",")[1];
      if (!base64) {
        reject(new Error("base64 inválido"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("falha ao ler áudio"));
    reader.readAsDataURL(blob);
  });
}

export function useCloudAudioStt(options: {
  sessionId: string | null;
  active: boolean;
  /** Whisper source hint: `auto`, `pt`, `en`, etc. */
  sourceLanguage?: string;
  captureOwner?: "main" | "stealth";
  captureMode: "microphone" | "system";
  /** When true, keeps the stream open but disables tracks and skips VAD segmentation. */
  muted?: boolean;
  speakerLabel: string;
  interimMessage: string;
  acquireStream: () => Promise<MediaStream>;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  onCloudSttFailed?: (message: string, code: string) => void;
}) {
  const {
    sessionId,
    active,
    sourceLanguage = "auto",
    captureOwner = "main",
    captureMode,
    muted = false,
    speakerLabel,
    interimMessage,
    acquireStream,
    onInterim,
    onError,
    onCloudSttFailed,
  } = options;

  const [status, setStatus] = useState<CloudAudioSttStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [chunksSent, setChunksSent] = useState(0);
  const [chunksSkipped, setChunksSkipped] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeRef = useRef("audio/webm");
  const recordingActiveRef = useRef(false);
  const busyRef = useRef(false);
  const sessionRef = useRef(sessionId);
  const langRef = useRef(sourceLanguage);
  const rafRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Audio-thread clock (ScriptProcessor) that keeps VAD ticking even when the
  // host webview is backgrounded/occluded — see startLevelMonitor.
  const clockNodeRef = useRef<ScriptProcessorNode | null>(null);
  const peakLevelRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const pendingBlobsRef = useRef<{ blob: Blob; mime: string }[]>([]);
  const lastSttSentAtRef = useRef(0);
  const mutedRef = useRef(muted);

  sessionRef.current = sessionId;
  mutedRef.current = muted;
  langRef.current = sourceLanguage;

  const isRecordingSegment = () =>
    recorderRef.current != null && recorderRef.current.state === "recording";

  const stopLevelMonitor = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (clockNodeRef.current) {
      clockNodeRef.current.onaudioprocess = null;
      try {
        clockNodeRef.current.disconnect();
      } catch {
        /* ignore */
      }
      clockNodeRef.current = null;
    }
    analyserRef.current = null;
    analyserDataRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setAudioLevel(0);
    setIsSpeaking(false);
  }, []);

  const flushPendingBlobs = useCallback(() => {
    if (busyRef.current || pendingBlobsRef.current.length === 0) return;
    const next = pendingBlobsRef.current.shift();
    if (next) {
      void ingestBlobRef.current?.(next.blob, next.mime);
    }
  }, []);

  const ingestBlobRef = useRef<
    ((blob: Blob, mime: string) => Promise<void>) | null
  >(null);

  const ingestBlob = useCallback(
    async (blob: Blob, mime: string) => {
      const sid = sessionRef.current;
      if (!sid) return;

      if (busyRef.current) {
        pendingBlobsRef.current.push({ blob, mime });
        return;
      }

      const sinceLast = Date.now() - lastSttSentAtRef.current;
      if (sinceLast < MIN_STT_INTERVAL_MS) {
        pendingBlobsRef.current.push({ blob, mime });
        return;
      }

      if (blob.size < MIN_BLOB_BYTES) {
        setChunksSkipped((n) => n + 1);
        return;
      }

      const whisperMime = normalizeMimeForWhisper(mime);
      if (!(await blobHasMediaContainerHeader(blob))) {
        setChunksSkipped((n) => n + 1);
        peakLevelRef.current = 0;
        return;
      }

      if (peakLevelRef.current < MIN_SPEECH_PEAK) {
        setChunksSkipped((n) => n + 1);
        peakLevelRef.current = 0;
        return;
      }
      peakLevelRef.current = 0;

      busyRef.current = true;
      lastSttSentAtRef.current = Date.now();
      setStatus("transcribing");
      onInterim?.(interimMessage);
      try {
        if (!isTauriRuntime()) {
          onError?.("Transcrição na nuvem requer o app desktop Tauri");
          return;
        }
        const base64 = await blobToBase64(blob);
        const res = await api.ingestSystemAudioChunk(
          sid,
          base64,
          whisperMime,
          langRef.current,
          speakerLabel,
          captureMode,
        );
        if (!res.ok || res.data === undefined) {
          const code = res.error?.code ?? "transcription_error";
          const msg = res.error?.message ?? "Falha ao transcrever áudio";
          if (code === "transcription_rate_limited") {
            pendingBlobsRef.current.unshift({ blob, mime: whisperMime });
            setStatus("capturing");
            onInterim?.("");
            return;
          }
          if (code === "transcription_no_speech") {
            setChunksSkipped((n) => n + 1);
            setStatus("capturing");
            onInterim?.("");
            return;
          }
          if (isRecoverableCloudSttFailure(code, msg)) {
            stopCaptureRef.current?.();
            onCloudSttFailed?.(msg, code);
          }
          setError(msg);
          setStatus("error");
          onError?.(msg);
          return;
        }
        setChunksSent((n) => n + 1);
        setStatus("capturing");
        onInterim?.("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus("error");
        onError?.(msg);
      } finally {
        busyRef.current = false;
        flushPendingBlobs();
      }
    },
    [
      interimMessage,
      onInterim,
      onError,
      onCloudSttFailed,
      speakerLabel,
      flushPendingBlobs,
    ],
  );

  ingestBlobRef.current = ingestBlob;

  const stopCaptureRef = useRef<(() => void) | null>(null);

  const endCurrentSegment = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    segmentStartedAtRef.current = null;
    silenceStartedAtRef.current = null;
  }, []);

  const startSegment = useCallback(
    (stream: MediaStream) => {
      if (!recordingActiveRef.current || isRecordingSegment()) return;

      peakLevelRef.current = 0;
      // Clone the stream so MediaRecorder.stop() doesn't affect the original
      // tracks feeding the AudioContext analyser (WebRTC/Windows AEC reset).
      const segmentStream = stream.clone();
      const recorderOptions = pickRecorderOptions(segmentStream);
      let recorder: MediaRecorder;
      try {
        recorder = recorderOptions
          ? new MediaRecorder(segmentStream, recorderOptions)
          : new MediaRecorder(segmentStream);
      } catch {
        recorder = new MediaRecorder(segmentStream);
      }

      mimeRef.current = normalizeMimeForWhisper(
        recorder.mimeType || recorderOptions?.mimeType || "audio/webm",
      );
      recorderRef.current = recorder;

      recorder.onerror = () => {
        segmentStream.getTracks().forEach((t) => t.stop());
        const msg = "Erro no gravador de áudio do navegador.";
        setError(msg);
        setStatus("error");
        onError?.(msg);
        stopCaptureRef.current?.();
      };

      const segmentStartedAt = Date.now();
      recorder.ondataavailable = (ev) => {
        segmentStream.getTracks().forEach((t) => t.stop());
        // A rolling_flush may start a new recorder before this fires (async).
        // Only clear shared refs if this recorder is still the active one.
        if (recorderRef.current === recorder) {
          recorderRef.current = null;
          segmentStartedAtRef.current = null;
          silenceStartedAtRef.current = null;
        }
        const segmentDur = Date.now() - segmentStartedAt;
        if (ev.data && ev.data.size > 0 && segmentDur >= MIN_SEGMENT_MS) {
          void ingestBlob(ev.data, mimeRef.current);
        }
      };

      try {
        recorder.start();
        segmentStartedAtRef.current = Date.now();
        silenceStartedAtRef.current = null;
      } catch (e) {
        segmentStream.getTracks().forEach((t) => t.stop());
        const msg = e instanceof Error ? e.message : "Falha ao iniciar gravação";
        setError(msg);
        onError?.(msg);
        recorderRef.current = null;
      }
    },
    [ingestBlob, onError, captureMode, captureOwner],
  );

  const runVadTick = useCallback(
    (level: number) => {
      const stream = streamRef.current;
      if (!stream || !recordingActiveRef.current || mutedRef.current) return;

      const now = Date.now();
      const recording = isRecordingSegment();

      if (shouldMarkSilenceStart(level, recording, silenceStartedAtRef.current)) {
        silenceStartedAtRef.current = now;
      }
      if (level >= SPEECH_LEVEL_THRESHOLD) {
        silenceStartedAtRef.current = null;
      }

      const action = vadSegmentAction({
        level,
        isRecording: recording,
        segmentStartedAt: segmentStartedAtRef.current,
        silenceStartedAt: silenceStartedAtRef.current,
        now,
      });

      if (action === "start_segment") {
        startSegment(stream);
      } else if (action === "rolling_flush") {
        endCurrentSegment();
        if (level >= SPEECH_LEVEL_THRESHOLD) {
          startSegment(stream);
        }
      } else if (action === "end_segment") {
        endCurrentSegment();
      }
    },
    [startSegment, endCurrentSegment],
  );

  /** Reads the analyser once and runs a VAD tick. Safe to call from any clock. */
  const sampleAndTick = useCallback(() => {
    const analyser = analyserRef.current;
    const data = analyserDataRef.current;
    if (!analyser || !data || !recordingActiveRef.current) return;
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]!;
    const avg = sum / data.length;
    const level = Math.min(1, avg / 96);
    peakLevelRef.current = Math.max(peakLevelRef.current, level);
    setAudioLevel(level);
    setIsSpeaking(level >= SPEECH_LEVEL_THRESHOLD);
    runVadTick(level);
  }, [runVadTick]);

  const startLevelMonitor = useCallback(
    (audioStream: MediaStream) => {
      stopLevelMonitor();
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(audioStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;
        analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount);

        const startClock = () => {
          // The mic bridge runs in the main webview, which is usually
          // backgrounded/occluded behind the stealth overlay. Chromium/WebView2
          // pauses requestAnimationFrame for hidden webviews, which previously
          // froze VAD segmentation entirely (no transcription until the user
          // muted). Drive the loop from an audio-thread node instead — the
          // AudioContext keeps rendering regardless of window visibility.
          if (typeof ctx.createScriptProcessor === "function") {
            try {
              const clock = ctx.createScriptProcessor(2048, 1, 1);
              // Empty output buffer => silence (no echo/feedback to speakers).
              clock.onaudioprocess = () => sampleAndTick();
              source.connect(clock);
              clock.connect(ctx.destination);
              clockNodeRef.current = clock;
              return;
            } catch {
              /* fall back to rAF below */
            }
          }
          const tick = () => {
            if (!recordingActiveRef.current) return;
            sampleAndTick();
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        };

        // WebView2/Chromium may start AudioContext suspended when there is
        // no prior user gesture in the window. Resume before ticking so that
        // getByteFrequencyData returns real samples instead of all zeros.
        if (ctx.state !== "running") {
          void ctx.resume().then(startClock).catch(() => setAudioLevel(0));
        } else {
          startClock();
        }
      } catch {
        setAudioLevel(0);
      }
    },
    [stopLevelMonitor, sampleAndTick],
  );

  const stopCapture = useCallback(() => {
    recordingActiveRef.current = false;
    if (isRecordingSegment()) {
      endCurrentSegment();
    }
    recorderRef.current = null;
    pendingBlobsRef.current = [];
    stopLevelMonitor();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturing(false);
    setStatus("idle");
    onInterim?.("");
    void api.releaseAudioCapture(captureMode, captureOwner);
  }, [onInterim, stopLevelMonitor, captureMode, captureOwner, endCurrentSegment]);

  stopCaptureRef.current = stopCapture;

  const startCapture = useCallback(async () => {
    if (!active || !sessionId) {
      const msg = "Inicie a sessão em escuta antes de capturar áudio.";
      setError(msg);
      onError?.(msg);
      return false;
    }

    stopCapture();
    setError(null);
    setChunksSent(0);
    setChunksSkipped(0);
    pendingBlobsRef.current = [];

    try {
      const claim = await api.claimAudioCapture(captureMode, captureOwner);
      if (!claim.ok) {
        const msg =
          claim.error?.message ??
          "Outra entrada de áudio está ativa nesta sessão.";
        setError(msg);
        onError?.(msg);
        return false;
      }

      const stream = await acquireStream();
      streamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const msg =
          captureMode === "system"
            ? 'Sem faixa de áudio. Compartilhe a tela inteira com "áudio do sistema".'
            : "Nenhum microfone detectado.";
        setError(msg);
        setStatus("error");
        onError?.(msg);
        return false;
      }

      audioTracks[0]?.addEventListener("ended", () => {
        setError("Captura de áudio encerrada.");
        setStatus("error");
        stopCapture();
      });

      recordingActiveRef.current = true;
      startLevelMonitor(stream);
      setCapturing(true);
      setStatus("capturing");
      return true;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Captura de áudio cancelada ou negada";
      setError(msg);
      setStatus("error");
      onError?.(msg);
      stopCapture();
      return false;
    }
  }, [
    active,
    sessionId,
    captureMode,
    captureOwner,
    acquireStream,
    onError,
    startLevelMonitor,
    stopCapture,
  ]);

  useEffect(() => {
    if (!active) {
      stopCapture();
    }
    return () => stopCapture();
  }, [active, stopCapture]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !muted;
    }
    if (muted && isRecordingSegment()) {
      endCurrentSegment();
    }
  }, [muted, endCurrentSegment]);

  return {
    status,
    error,
    capturing,
    audioLevel,
    isSpeaking,
    chunksSent,
    chunksSkipped,
    startCapture,
    stopCapture,
  };
}
