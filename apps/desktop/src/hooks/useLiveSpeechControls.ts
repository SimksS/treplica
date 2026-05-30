import { useCallback, useEffect, useRef, useState } from "react";

import {
  isTranslationModeReady,
  type LiveSpeechMode,
} from "../lib/liveLanguages";
import { readOverlaySpeechPrefs } from "../lib/overlaySpeechPrefs";

type SessionSlice = {
  sessionId: string | null;
  targetLanguage: string;
  setTargetLanguageForSession: (language: string) => Promise<void>;
};

export function useLiveSpeechControls(session: SessionSlice) {
  const [speechMode, setSpeechMode] = useState<LiveSpeechMode>("transcription");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const syncedSessionRef = useRef<string | null>(null);

  // Initial sync: read localStorage prefs and set mode/language for the new session.
  useEffect(() => {
    if (!session.sessionId) {
      syncedSessionRef.current = null;
      return;
    }
    if (syncedSessionRef.current === session.sessionId) return;
    syncedSessionRef.current = session.sessionId;

    const prefs = readOverlaySpeechPrefs();
    setSourceLanguage(prefs.sourceLanguage);

    if (prefs.mode === "translation" && prefs.targetLanguage) {
      setSpeechMode("translation");
      void session.setTargetLanguageForSession(prefs.targetLanguage);
      return;
    }

    if (session.targetLanguage) {
      setSpeechMode("translation");
      return;
    }

    setSpeechMode("transcription");
  }, [
    session.sessionId,
    session.targetLanguage,
    session.setTargetLanguageForSession,
  ]);

  // Reactive sync: when targetLanguage arrives asynchronously after the initial sync
  // (e.g. setTargetLanguageForSession resolves, or main window sets it externally),
  // switch to translation mode. onModeChange("transcription") clears targetLanguage,
  // so this won't fight with an explicit user switch back to transcription.
  useEffect(() => {
    if (session.targetLanguage) {
      setSpeechMode("translation");
    }
  }, [session.targetLanguage]);

  const captureReady = isTranslationModeReady(
    speechMode,
    session.targetLanguage,
  );

  const onModeChange = useCallback(
    (mode: LiveSpeechMode) => {
      setSpeechMode(mode);
      if (mode === "transcription") {
        void session.setTargetLanguageForSession("");
      }
    },
    [session],
  );

  const onTargetChange = useCallback(
    (code: string) => {
      void session.setTargetLanguageForSession(code);
    },
    [session],
  );

  return {
    speechMode,
    sourceLanguage,
    setSourceLanguage,
    captureReady,
    onModeChange,
    onTargetChange,
  };
}
