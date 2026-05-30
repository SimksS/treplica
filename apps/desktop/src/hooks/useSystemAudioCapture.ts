import { useCallback, useEffect, useRef } from "react";

import { useThrottledCallback } from "../lib/throttle";

import { emit } from "@tauri-apps/api/event";

import * as api from "../lib/tauriClient";
import { isTauriRuntime } from "../lib/tauriEvents";
import type { SystemAudioOverlayStatusPayload } from "../lib/types";

import { useCloudAudioStt } from "./useCloudAudioStt";
import { useNativeSystemAudio } from "./useNativeSystemAudio";

export type SystemAudioCaptureStatus =
  | "idle"
  | "sharing"
  | "transcribing"
  | "error";

export function systemAudioCaptureSupported(): boolean {
  if (isTauriRuntime()) {
    return true;
  }
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia)
  );
}

function buildDisplayMediaOptions(): DisplayMediaStreamOptions {
  return {
    video: {
      width: { ideal: 320 },
      height: { ideal: 180 },
      frameRate: { ideal: 5, max: 10 },
    },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      suppressLocalAudioPlayback: false,
    },
    systemAudio: "include",
    selfBrowserSurface: "exclude",
    preferCurrentTab: false,
    monitorTypeSurfaces: "include",
  } as DisplayMediaStreamOptions;
}

async function suspendStealthCaptureExclusion(active: boolean): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    await api.setOverlaySystemAudioCaptureActive(active);
  } catch {
    /* overlay may be closed */
  }
}

export function useSystemAudioCapture(options: {
  sessionId: string | null;
  active: boolean;
  sourceLanguage?: string;
  captureOwner?: "main" | "stealth";
  autoStart?: boolean;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  onCloudSttFailed?: (message: string, code: string) => void;
  emitOverlayStatus?: boolean;
}) {
  const {
    captureOwner = "main",
    emitOverlayStatus = false,
    autoStart = false,
    ...rest
  } = options;

  const native = useNativeSystemAudio({
    ...rest,
    captureOwner,
    autoStart,
  });

  const stealthSuspensionRef = useRef(false);
  const browserAutoStartedRef = useRef(false);

  const releaseStealthSuspension = useCallback(async () => {
    if (!stealthSuspensionRef.current) return;
    stealthSuspensionRef.current = false;
    if (captureOwner === "stealth") {
      await suspendStealthCaptureExclusion(false);
    }
  }, [captureOwner]);

  const acquireStream = useCallback(async () => {
    if (captureOwner === "stealth") {
      await suspendStealthCaptureExclusion(true);
      stealthSuspensionRef.current = true;
      await new Promise((r) => setTimeout(r, 80));
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia(
        buildDisplayMediaOptions(),
      );
      displayStream.getVideoTracks().forEach((track) => track.stop());

      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach((t) => t.stop());
        await releaseStealthSuspension();
        return displayStream;
      }
      return new MediaStream(audioTracks);
    } catch (e) {
      await releaseStealthSuspension();
      throw e;
    }
  }, [captureOwner, releaseStealthSuspension]);

  const browserStt = useCloudAudioStt({
    ...rest,
    captureOwner,
    captureMode: "system",
    speakerLabel: "Sistema",
    interimMessage: "Transcrevendo áudio do sistema…",
    acquireStream,
  });

  const loopbackReady = native.supportResolved;
  const useBrowser = loopbackReady && !native.usesNative;

  const stopCapture = useCallback(() => {
    browserAutoStartedRef.current = false;
    if (useBrowser) {
      browserStt.stopCapture();
      void releaseStealthSuspension();
    } else {
      void native.stopCapture();
    }
  }, [useBrowser, browserStt, native.stopCapture, releaseStealthSuspension]);

  const startCapture = useCallback(async () => {
    if (!loopbackReady) {
      return false;
    }
    if (useBrowser) {
      return browserStt.startCapture();
    }
    return native.startCapture();
  }, [loopbackReady, useBrowser, browserStt.startCapture, native.startCapture]);

  const capturing = useBrowser ? browserStt.capturing : native.sharing;
  const audioLevel = useBrowser ? browserStt.audioLevel : native.audioLevel;
  const chunksSent = useBrowser ? browserStt.chunksSent : native.chunksSent;
  const chunksSkipped = useBrowser ? browserStt.chunksSkipped : native.chunksSkipped;
  const error = useBrowser ? browserStt.error : native.error;
  const sttStatus = useBrowser ? browserStt.status : native.status;

  // If browser capture started before we knew native was available, stop it.
  useEffect(() => {
    if (!loopbackReady || useBrowser) return;
    if (browserStt.capturing) {
      browserStt.stopCapture();
      void releaseStealthSuspension();
    }
    browserAutoStartedRef.current = false;
  }, [
    loopbackReady,
    useBrowser,
    browserStt.capturing,
    browserStt.stopCapture,
    releaseStealthSuspension,
  ]);

  useEffect(() => {
    if (useBrowser && !browserStt.capturing) {
      void releaseStealthSuspension();
    }
  }, [useBrowser, browserStt.capturing, releaseStealthSuspension]);

  useEffect(() => {
    if (!autoStart || !loopbackReady || !useBrowser || !rest.active) {
      browserAutoStartedRef.current = false;
      return;
    }
    if (browserAutoStartedRef.current || browserStt.capturing) return;
    browserAutoStartedRef.current = true;
    void browserStt.startCapture();
  }, [
    autoStart,
    loopbackReady,
    useBrowser,
    rest.active,
    browserStt.capturing,
    browserStt.startCapture,
  ]);

  const emitOverlayStatusEvent = useThrottledCallback(
    (payload: SystemAudioOverlayStatusPayload) => {
      void emit("system-audio-overlay-status", payload);
    },
    100,
  );

  const overlaySnapshotRef = useRef({
    sharing: false,
    audio_level: 0,
    status: "idle",
    error: null as string | null,
    chunks_sent: 0,
    chunks_skipped: 0,
  });

  useEffect(() => {
    if (!emitOverlayStatus || !isTauriRuntime()) return;
    const payload: SystemAudioOverlayStatusPayload = {
      sharing: capturing,
      audio_level: audioLevel,
      status: sttStatus === "capturing" ? "sharing" : sttStatus,
      error,
      chunks_sent: chunksSent,
      chunks_skipped: chunksSkipped,
    };
    const prev = overlaySnapshotRef.current;
    const levelOnlyChange =
      prev.sharing === payload.sharing &&
      prev.status === payload.status &&
      prev.error === payload.error &&
      prev.chunks_sent === payload.chunks_sent &&
      prev.chunks_skipped === payload.chunks_skipped &&
      prev.audio_level !== payload.audio_level;

    if (levelOnlyChange) {
      emitOverlayStatusEvent(payload);
      overlaySnapshotRef.current = {
        ...prev,
        audio_level: payload.audio_level,
      };
    } else {
      overlaySnapshotRef.current = payload;
      void emit("system-audio-overlay-status", payload);
    }
  }, [
    emitOverlayStatus,
    capturing,
    audioLevel,
    sttStatus,
    error,
    chunksSent,
    chunksSkipped,
    emitOverlayStatusEvent,
  ]);

  const status: SystemAudioCaptureStatus =
    sttStatus === "capturing" ? "sharing" : sttStatus;

  return {
    status,
    error,
    sharing: capturing,
    audioLevel,
    chunksSent,
    chunksSkipped,
    startCapture,
    stopCapture,
    supported: systemAudioCaptureSupported(),
    usesNativeLoopback: native.usesNative,
    loopbackReady,
  };
}
