import { useCallback, useEffect } from "react";

import {
  resolveSpeechLang,
  speechRecognitionSupported,
  useSpeechRecognition,
} from "../../hooks/useSpeechRecognition";
import { resolveWebSpeechLangFromSource } from "../../lib/liveLanguages";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { SessionStatus } from "../../lib/types";

interface Props {
  sessionId: string | null;
  status: SessionStatus;
  /** Preferred: `auto`, `pt`, `en`, … */
  sourceLanguage?: string;
  languageMode?: string;
  languageCustom?: string | null;
  /** When true, UI clarifies that cloud STT is not in use. */
  fallbackMode?: boolean;
  /** When false, recognition is fully stopped (e.g. system audio active). */
  enabled?: boolean;
  captureOwner?: "main" | "stealth";
  onInterim: (text: string) => void;
  onIngested: () => void;
  onError?: (message: string) => void;
}

export function LiveSpeechCapture({
  sessionId,
  status,
  sourceLanguage,
  languageMode = "auto",
  languageCustom,
  fallbackMode = false,
  enabled = true,
  captureOwner = "main",
  onInterim,
  onIngested,
  onError,
}: Props) {
  const lang = sourceLanguage
    ? resolveWebSpeechLangFromSource(sourceLanguage, languageCustom)
    : resolveSpeechLang(languageMode, languageCustom);

  const handleFinal = useCallback(
    (text: string) => {
      if (!sessionId || status !== "listening") return;
      void (async () => {
        try {
          unwrap(await api.ingestLiveTranscript(sessionId, text, null, lang));
          onIngested();
        } catch {
          /* erros de pipeline via eventos da sessão */
        }
      })();
    },
    [sessionId, status, lang, onIngested],
  );

  const speech = useSpeechRecognition(lang, {
    onFinal: handleFinal,
    displayMode: "interim-only",
  });

  useEffect(() => {
    onInterim(speech.interim);
  }, [speech.interim, onInterim]);

  useEffect(() => {
    if (!enabled || !sessionId || status !== "listening") {
      speech.stop();
      void api.releaseAudioCapture("microphone", captureOwner);
      return;
    }
    if (!speechRecognitionSupported()) return;
    void (async () => {
      try {
        const claim = await api.claimAudioCapture("microphone", captureOwner);
        if (!claim.ok) {
          const msg =
            claim.error?.message ??
            "Microfone indisponível — outra janela pode estar usando o áudio.";
          onError?.(msg);
          speech.stop();
          return;
        }
        speech.start();
      } catch (e) {
        speech.stop();
        onError?.(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      speech.stop();
      void api.releaseAudioCapture("microphone", captureOwner);
    };
  }, [sessionId, status, enabled, captureOwner]);

  if (!speechRecognitionSupported()) {
    return (
      <p className="live-hint" data-testid="speech-unsupported">
        Reconhecimento de voz do navegador indisponível — use &quot;Simular fala&quot; ou
        digite manualmente.
      </p>
    );
  }

  if (speech.error) {
    return (
      <p className="live-error" data-testid="speech-error" role="alert">
        {speech.error}
      </p>
    );
  }

  return (
    <p className="live-hint" data-testid="speech-status">
      {speech.listening
        ? fallbackMode
          ? "Ouvindo microfone (Web Speech — sem API de transcrição)…"
          : "Ouvindo microfone (Web Speech)…"
        : "Microfone pausado"}
    </p>
  );
}
