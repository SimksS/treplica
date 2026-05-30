import { resolveSpeechLang } from "../hooks/useSpeechRecognition";

export type LiveSpeechMode = "transcription" | "translation";

export const SPEECH_SOURCE_LANGUAGES = [
  { code: "auto", label: "Detectar automaticamente" },
  { code: "pt", label: "Português" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
] as const;

export const SPEECH_TARGET_LANGUAGES = [
  { code: "", label: "Selecione o idioma…" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
  { code: "pt", label: "Português" },
] as const;

const WEB_SPEECH_BY_SOURCE: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

/** `null` = Whisper auto-detect (omit API language param). */
export function resolveWhisperSourceLanguage(sourceCode: string): string | null {
  const code = sourceCode.trim().toLowerCase();
  if (!code || code === "auto") return null;
  return code.split("-")[0] ?? code;
}

export function resolveWebSpeechLangFromSource(
  sourceCode: string,
  fallbackCustom?: string | null,
): string {
  if (sourceCode === "auto") {
    return resolveSpeechLang("auto", fallbackCustom);
  }
  return WEB_SPEECH_BY_SOURCE[sourceCode] ?? sourceCode;
}

export function sourceLanguageLabel(code: string): string {
  return (
    SPEECH_SOURCE_LANGUAGES.find((l) => l.code === code)?.label ?? code
  );
}

export function targetLanguageLabel(code: string): string {
  return (
    SPEECH_TARGET_LANGUAGES.find((l) => l.code === code)?.label ?? code
  );
}

export function isTranslationModeReady(
  mode: LiveSpeechMode,
  targetLanguage: string,
): boolean {
  if (mode !== "translation") return true;
  return Boolean(targetLanguage.trim());
}
