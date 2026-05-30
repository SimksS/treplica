import { useCallback, useState } from "react";
import { emit } from "@tauri-apps/api/event";

import { CloudMicrophoneCapture } from "./CloudMicrophoneCapture";
import { useThrottledCallback } from "../../lib/throttle";
import { useTauriListen } from "../../lib/tauriEvents";
import type { MicrophoneBridgePayload, MicOverlayStatusPayload } from "../../lib/types";

type BridgeSession = {
  sessionId: string;
  sourceLanguage: string;
  muted: boolean;
  withSystemAudio: boolean;
};

function payloadToSession(payload: MicrophoneBridgePayload): BridgeSession | null {
  if (payload.action !== "start" || !payload.session_id) return null;
  return {
    sessionId: payload.session_id,
    sourceLanguage: payload.source_language ?? "auto",
    muted: Boolean(payload.muted),
    withSystemAudio: Boolean(payload.with_system_audio),
  };
}

/** Runs cloud mic capture in the main webview (preflight permissions) for the stealth overlay. */
export function MainMicrophoneBridge() {
  const [session, setSession] = useState<BridgeSession | null>(null);

  useTauriListen<MicrophoneBridgePayload>("microphone-bridge", (payload) => {
    if (payload.action === "stop") {
      setSession(null);
      void emit("mic-overlay-status", {
        audio_level: 0,
        capturing: false,
        error: null,
      } satisfies MicOverlayStatusPayload);
      return;
    }
    setSession(payloadToSession(payload));
  });

  const publishStatus = useCallback((partial: Partial<MicOverlayStatusPayload>) => {
    void emit("mic-overlay-status", {
      audio_level: partial.audio_level ?? 0,
      capturing: partial.capturing ?? false,
      error: partial.error ?? null,
      interim: partial.interim ?? null,
    } satisfies MicOverlayStatusPayload);
  }, []);

  const publishLevel = useThrottledCallback(
    (level: number) => {
      publishStatus({ audio_level: level, capturing: true, error: null });
    },
    100,
  );

  if (!session) return null;

  return (
    <div className="main-mic-bridge" hidden aria-hidden data-testid="main-mic-bridge">
      <CloudMicrophoneCapture
        sessionId={session.sessionId}
        status="listening"
        sourceLanguage={session.sourceLanguage}
        captureOwner="main"
        autoStart
        muted={session.muted}
        withSystemAudio={session.withSystemAudio}
        onAudioLevel={publishLevel}
        onInterim={(text) => {
          publishStatus({ interim: text || null, capturing: true });
        }}
        onError={(msg) => {
          publishStatus({ error: msg, capturing: false, audio_level: 0 });
        }}
        onCloudSttFailed={(msg) => {
          publishStatus({ error: msg, capturing: false, audio_level: 0 });
        }}
      />
    </div>
  );
}
