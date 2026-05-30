import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeAudioLevel } from "../lib/audioMeter";
import * as api from "../lib/tauriClient";
import type { NativeSystemAudioStatusDto } from "../lib/tauriClient";
import { isTauriRuntime, useTauriListen } from "../lib/tauriEvents";

export type NativeMicStatus = "idle" | "capturing" | "transcribing" | "error";

function mapStatus(dto: NativeSystemAudioStatusDto): NativeMicStatus {
  if (dto.status === "transcribing") return "transcribing";
  if (dto.status === "error") return "error";
  if (dto.active) return "capturing";
  return "idle";
}

/**
 * Native (Rust/cpal) microphone capture. Runs on a backend thread so VAD and
 * STT keep working even when the host webview is backgrounded behind the
 * stealth overlay — the browser MediaRecorder path froze in that case.
 */
export function useNativeMicrophone(options: {
  sessionId: string | null;
  active: boolean;
  sourceLanguage?: string;
  captureOwner?: "main" | "stealth";
  autoStart?: boolean;
  muted?: boolean;
  onLevel?: (level: number) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const {
    sessionId,
    active,
    sourceLanguage = "auto",
    captureOwner = "stealth",
    autoStart = false,
    muted = false,
    onLevel,
    onInterim,
    onError,
  } = options;

  const [supported, setSupported] = useState(false);
  const [supportResolved, setSupportResolved] = useState(!isTauriRuntime());
  const [capturing, setCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<NativeMicStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const autoStartedRef = useRef(false);
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;
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
    void api.nativeMicrophoneSupported().then((ok) => {
      if (!cancelled) {
        setSupported(ok);
        setSupportResolved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyDto = useCallback((dto: NativeSystemAudioStatusDto) => {
    setCapturing(dto.active);
    const level = normalizeAudioLevel(dto);
    setAudioLevel(level);
    onLevelRef.current?.(level);
    setStatus(mapStatus(dto));
    setError(dto.error ?? null);
    if (dto.status === "transcribing") {
      onInterimRef.current?.("Transcrevendo microfone na nuvem…");
    } else {
      onInterimRef.current?.("");
    }
    if (dto.error) {
      onErrorRef.current?.(dto.error);
    }
  }, []);

  // Remembers which session started the capture so stop calls from old effects
  // can pass a session_id guard to the backend.
  const startedForSessionRef = useRef<string | null>(null);

  const stopCapture = useCallback(
    async (forSession?: string | null) => {
      autoStartedRef.current = false;
      if (!isTauriRuntime()) return;
      try {
        const res = await api.stopNativeMicrophone(captureOwner, forSession ?? null);
        if (res.ok && res.data) {
          applyDto(res.data);
        } else {
          setCapturing(false);
          setStatus("idle");
          setAudioLevel(0);
        }
      } catch {
        setCapturing(false);
        setStatus("idle");
      }
      onInterimRef.current?.("");
    },
    [applyDto, captureOwner],
  );

  const startCapture = useCallback(async () => {
    if (!active || !sessionId || !supported) return false;
    setError(null);
    try {
      const res = await api.startNativeMicrophone({
        sessionId,
        sourceLanguage,
        owner: captureOwner,
        muted,
      });
      if (!res.ok) {
        const msg =
          res.error?.message ?? "Não foi possível iniciar o microfone.";
        setError(msg);
        setStatus("error");
        onErrorRef.current?.(msg);
        return false;
      }
      startedForSessionRef.current = sessionId;
      if (res.data) applyDto(res.data);
      return true;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Falha ao iniciar o microfone.";
      setError(msg);
      setStatus("error");
      onErrorRef.current?.(msg);
      return false;
    }
  }, [active, sessionId, supported, sourceLanguage, captureOwner, muted, applyDto]);

  const stopCaptureRef = useRef(stopCapture);
  stopCaptureRef.current = stopCapture;
  const startCaptureRef = useRef(startCapture);
  startCaptureRef.current = startCapture;

  useTauriListen<NativeSystemAudioStatusDto>(
    "native-mic-status",
    (dto) => applyDto(dto),
    supported && isTauriRuntime(),
  );

  // Toggle mute without restarting the stream.
  useEffect(() => {
    if (!isTauriRuntime() || !supported || !capturing) return;
    void api.setNativeMicrophoneMuted(muted);
  }, [muted, supported, capturing]);

  useEffect(() => {
    if (!supportResolved) return;
    if (!active || !sessionId || !supported) {
      autoStartedRef.current = false;
      // Pass the session we started for so the backend can ignore this stop
      // if a newer session has already claimed the mic (race guard).
      const stoppedForSession = startedForSessionRef.current;
      startedForSessionRef.current = null;
      void stopCaptureRef.current(stoppedForSession);
      return;
    }
    if (!autoStart || autoStartedRef.current) return;

    let cancelled = false;
    autoStartedRef.current = true;
    void (async () => {
      const ok = await startCaptureRef.current();
      if (!ok || cancelled) autoStartedRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [supportResolved, autoStart, active, sessionId, supported]);

  useEffect(() => {
    return () => {
      // Unmount: stop unconditionally (no session guard needed).
      void stopCaptureRef.current();
    };
  }, []);

  return {
    supported,
    supportResolved,
    capturing,
    audioLevel,
    status,
    error,
    startCapture,
    stopCapture,
  };
}
