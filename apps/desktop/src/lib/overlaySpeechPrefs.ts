import type { LiveSpeechMode } from "./liveLanguages";

export interface OverlaySpeechPrefs {
  mode: LiveSpeechMode;
  sourceLanguage: string;
  targetLanguage: string;
}

export function readOverlaySpeechPrefs(): OverlaySpeechPrefs {
  try {
    const mode =
      (localStorage.getItem("treplica_overlay_speech_mode") as LiveSpeechMode | null) ??
      "transcription";
    return {
      mode: mode === "translation" ? "translation" : "transcription",
      sourceLanguage:
        localStorage.getItem("treplica_overlay_source_language") ?? "auto",
      targetLanguage:
        localStorage.getItem("treplica_overlay_target_language") ?? "",
    };
  } catch {
    return {
      mode: "transcription",
      sourceLanguage: "auto",
      targetLanguage: "",
    };
  }
}

export function writeOverlaySpeechPrefs(prefs: OverlaySpeechPrefs): void {
  try {
    localStorage.setItem("treplica_overlay_speech_mode", prefs.mode);
    localStorage.setItem(
      "treplica_overlay_source_language",
      prefs.sourceLanguage,
    );
    localStorage.setItem(
      "treplica_overlay_target_language",
      prefs.targetLanguage,
    );
  } catch {
    /* ignore */
  }
}
