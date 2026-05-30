import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeAudioLevel } from "../lib/audioMeter";
import * as api from "../lib/tauriClient";
import type { NativeSystemAudioStatusDto } from "../lib/tauriClient";
import { isTauriRuntime, useTauriListen } from "../lib/tauriEvents";

import type { SystemAudioCaptureStatus } from "./useSystemAudioCapture";

function mapStatus(dto: NativeSystemAudioStatusDto): SystemAudioCaptureStatus {
  if (dto.status === "transcribing") return "transcribing";
  if (dto.status === "error") return "error";
  if (dto.active) return "sharing";
  return "idle";
}

export function useNativeSystemAudio(options: {
  sessionId: string | null;
  active: boolean;
  sourceLanguage?: string;
  captureOwner?: "main" | "stealth";
  /** Start loopback capture when `active` becomes true. */
  autoStart?: boolean;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const {
    sessionId,
    active,
    sourceLanguage = "auto",
    captureOwner = "main",
    autoStart = false,
    onInterim,
    onError,
  } = options;

  const [supported, setSupported] = useState(false);
  /** False until we know whether native loopback is available (avoids browser fallback race). */
  const [supportResolved, setSupportResolved] = useState(!isTauriRuntime());
  const [sharing, setSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [chunksSent, setChunksSent] = useState(0);
  const [chunksSkipped, setChunksSkipped] = useState(0);
  const [status, setStatus] = useState<SystemAudioCaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const autoStartedRef = useRef(false);
  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isTauriRuntime()) {
      setSupported(false);
      setSupportResolved(true);
      return;
    }
    let cancelled = false;
    void api.nativeSystemAudioSupported().then((nativeOk) => {
      if (!cancelled) {
        setSupported(nativeOk);
        setSupportResolved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyDto = useCallback((dto: NativeSystemAudioStatusDto) => {
    setSharing(dto.active);
    setAudioLevel(normalizeAudioLevel(dto));
    setChunksSent(Number(dto.chunks_sent ?? (dto as { chunksSent?: number }).chunksSent) || 0);
    setChunksSkipped(
      Number(dto.chunks_skipped ?? (dto as { chunksSkipped?: number }).chunksSkipped) || 0,
    );
    setStatus(mapStatus(dto));
    setError(dto.error ?? null);
    if (dto.status === "transcribing") {
      onInterimRef.current?.("Transcrevendo áudio do sistema…");
    }
    if (dto.error) {
      onErrorRef.current?.(dto.error);
    }
  }, []);

  const stopCapture = useCallback(async () => {
    autoStartedRef.current = false;
    if (!isTauriRuntime()) return;
    try {
      const res = await api.stopNativeSystemAudio(captureOwner);
      if (res.ok && res.data) {
        applyDto(res.data);
      } else {
        setSharing(false);
        setStatus("idle");
        setAudioLevel(0);
      }
    } catch {
      setSharing(false);
      setStatus("idle");
    }
    onInterimRef.current?.("");
  }, [applyDto, captureOwner]);

  const startCapture = useCallback(async () => {
    if (!active || !sessionId || !supported) {
      return false;
    }
    setError(null);
    try {
      const res = await api.startNativeSystemAudio({
        sessionId,
        sourceLanguage,
        owner: captureOwner,
      });
      if (!res.ok) {
        const msg =
          res.error?.message ?? "Não foi possível iniciar a captura de áudio do sistema.";
        setError(msg);
        setStatus("error");
        onErrorRef.current?.(msg);
        return false;
      }
      if (res.data) {
        applyDto(res.data);
      }
      return true;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Falha ao iniciar captura de áudio do sistema.";
      setError(msg);
      setStatus("error");
      onErrorRef.current?.(msg);
      return false;
    }
  }, [active, sessionId, supported, sourceLanguage, captureOwner, applyDto]);

  const stopCaptureRef = useRef(stopCapture);
  stopCaptureRef.current = stopCapture;
  const startCaptureRef = useRef(startCapture);
  startCaptureRef.current = startCapture;

  useTauriListen<NativeSystemAudioStatusDto>(
    "native-system-audio-status",
    (dto) => {
      applyDto(dto);
    },
    supported && isTauriRuntime(),
  );

  useEffect(() => {
    if (!isTauriRuntime() || !supported) return;
    let cancelled = false;
    void api.getNativeSystemAudioStatus().then((dto) => {
      if (!cancelled) applyDto(dto);
    });
    return () => {
      cancelled = true;
    };
  }, [supported, applyDto]);

  useEffect(() => {
    if (!supportResolved) return;
    if (!active || !sessionId || !supported) {
      autoStartedRef.current = false;
      void stopCaptureRef.current();
      return;
    }
    if (!autoStart) return;
    if (autoStartedRef.current) return;

    let cancelled = false;
    autoStartedRef.current = true;
    void (async () => {
      const ok = await startCaptureRef.current();
      if (!ok || cancelled) {
        autoStartedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supportResolved, autoStart, active, sessionId, supported]);

  useEffect(() => {
    return () => {
      void stopCaptureRef.current();
    };
  }, []);

  return {
    usesNative: supported,
    supportResolved,
    status,
    error,
    sharing,
    audioLevel,
    chunksSent,
    chunksSkipped,
    startCapture,
    stopCapture,
    supported,
  };
}
