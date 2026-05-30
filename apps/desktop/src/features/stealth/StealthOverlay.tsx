import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import { useLiveSession } from "../live-session/useLiveSession";
import {
  useSessionLeavePrompt,
  useSessionLifecycleListeners,
} from "../../hooks/useSessionLeavePrompt";
import type { StealthStatusDto } from "../../lib/types";
import { IconEye, IconEyeOff } from "../../components/layout/Icons";
import { OverlayLiveWorkspace } from "./OverlayLiveWorkspace";
import "../../styles/stealth-overlay.css";

export function StealthOverlay() {
  const [status, setStatus] = useState<StealthStatusDto | null>(null);
  const [guidanceHotkey, setGuidanceHotkey] = useState("Ctrl+Shift+O");
  const session = useLiveSession();
  const leave = useSessionLeavePrompt(session);
  useSessionLifecycleListeners(session, leave.requestLeave);

  const loadStatus = useCallback(async () => {
    try {
      const s = unwrap(await api.getStealthStatus());
      setStatus(s);
    } catch {
      setStatus({
        overlay_visible: true,
        always_on_top: true,
        capture_exclusion: "unknown",
        capture_exclusion_detail: "",
        platform: "",
        hotkey: "Ctrl+Shift+H",
        capture_hidden_in_recording: true,
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("stealth-root");
    void loadStatus();
    void session.hydrateFromActiveSession();
    void (async () => {
      try {
        const onboarding = unwrap(await api.getOnboardingState());
        setGuidanceHotkey(onboarding.send_transcript_hotkey || "Ctrl+Shift+O");
      } catch {
        /* default */
      }
    })();
    void (async () => {
      try {
        const a11y = unwrap(await api.getAccessibilitySettings());
        document.documentElement.style.setProperty(
          "--overlay-font-scale",
          String(a11y.overlay_font_scale),
        );
        document.documentElement.classList.toggle("reduce-motion", a11y.reduce_motion);
        document.documentElement.classList.toggle("high-contrast", a11y.high_contrast);
      } catch {
        /* use CSS defaults */
      }
    })();
    return () => {
      document.documentElement.classList.remove("stealth-root");
      void api.releaseAllAudioCapture("stealth");
      void api.microphoneBridge({ action: "stop", sessionId: "" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on overlay mount
  }, [loadStatus]);

  const toggleCaptureVisibility = async () => {
    try {
      const next = await api.toggleOverlayCaptureExclusion();
      setStatus(next);
    } catch {
      await loadStatus();
    }
  };

  const openMain = async () => {
    try {
      await api.focusMainWindow();
    } catch (e) {
      session.reportError(
        e instanceof Error ? e.message : "Não foi possível reabrir a janela principal.",
      );
    }
  };

  if (!status) return null;

  const hiddenInCapture =
    status.capture_hidden_in_recording && status.capture_exclusion === "active";
  const sessionLabel = session.sessionId ? session.status : "sem sessão";
  const dotClass = !session.sessionId
    ? "inactive"
    : hiddenInCapture
      ? "protected"
      : "";

  return (
    <div className="stealth-overlay" data-testid="stealth-overlay">
      <header className="stealth-overlay-header">
        <span
          className={`stealth-dot ${dotClass}`}
          data-testid="stealth-capture-status"
          title={status.capture_exclusion_detail}
        />
        <span className="stealth-overlay-title">Treplica</span>
        <button
          type="button"
          className={`stealth-capture-btn ${status.capture_hidden_in_recording ? "stealth-capture-btn--active" : ""}`}
          onClick={() => void toggleCaptureVisibility()}
          data-testid="overlay-toggle-capture-exclusion"
          title={status.capture_exclusion_detail}
        >
          {status.capture_hidden_in_recording ? <IconEyeOff size={13} /> : <IconEye size={13} />}
          <span className="stealth-capture-btn__label">Modo stealth</span>
          <span className="stealth-capture-btn__state">
            {status.capture_hidden_in_recording ? "ativo" : "inativo"}
          </span>
        </button>
        <span className="stealth-status-pill" data-testid="overlay-session-status">
          {sessionLabel}
        </span>
        <span className="stealth-hotkey">{status.hotkey}</span>
      </header>

      <OverlayLiveWorkspace
        session={session}
        guidanceHotkey={guidanceHotkey}
        onOpenMain={() => void openMain()}
      />

      {leave.modal}
    </div>
  );
}
