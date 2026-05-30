import { useCallback, useEffect, useRef, useState } from "react";

import {
  extractNewSpeechSegment,
  mergeCommittedTranscript,
} from "../lib/speechRecognitionDelta";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function speechRecognitionSupported(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition),
  );
}

const BCP47 = new Set(["pt-BR", "en-US", "es-ES", "fr-FR"]);

export function resolveSpeechLang(mode: string, custom?: string | null): string {
  if (BCP47.has(mode)) return mode;
  if (mode === "custom" && custom?.trim()) {
    const c = custom.trim().toLowerCase();
    if (c.includes("portugu") || c.includes("brasil")) return "pt-BR";
    if (c.includes("english") || c.includes("ingl")) return "en-US";
    if (c.includes("spanish") || c.includes("espanhol")) return "es-ES";
    if (c.includes("french") || c.includes("franc")) return "fr-FR";
    return custom.trim();
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "pt-BR";
}

export type SpeechRecognitionDisplayMode = "interim-only" | "accumulated";

export function useSpeechRecognition(
  lang: string,
  options?: {
    onFinal?: (text: string) => void;
    /** Live session: only show partial phrase. Setup wizard: show full accumulated text. */
    displayMode?: SpeechRecognitionDisplayMode;
  },
) {
  const displayMode = options?.displayMode ?? "interim-only";
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const committedRef = useRef("");
  const onFinalRef = useRef(options?.onFinal);
  onFinalRef.current = options?.onFinal;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setError(
        "Reconhecimento de voz não disponível neste ambiente. Use o simulador ou o app desktop Tauri.",
      );
      return;
    }
    setError(null);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = (event) => {
      let finalPayload = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalPayload += text;
        else interimChunk += text;
      }
      if (finalPayload) {
        const trimmed = finalPayload.trim();
        if (trimmed) {
          const delta = extractNewSpeechSegment(committedRef.current, trimmed);
          committedRef.current = mergeCommittedTranscript(
            committedRef.current,
            trimmed,
          );
          if (delta) onFinalRef.current?.(delta);
        }
        if (displayMode === "accumulated") {
          setTranscript((prev) => `${prev}${finalPayload}`.trim() + " ");
        }
        setInterim("");
      } else {
        setInterim(interimChunk);
      }
    };
    recognition.onerror = (ev) => {
      if (ev.error !== "aborted") {
        setError(`Erro de transcrição: ${ev.error}`);
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [lang, displayMode]);

  const reset = useCallback(() => {
    stop();
    committedRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
  }, [stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const displayText =
    displayMode === "accumulated"
      ? `${transcript}${interim}`.trim()
      : interim.trim();

  return {
    listening,
    transcript,
    interim,
    displayText,
    error,
    start,
    stop,
    reset,
    supported: speechRecognitionSupported(),
  };
}
