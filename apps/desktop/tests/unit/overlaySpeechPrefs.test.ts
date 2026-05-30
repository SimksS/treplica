import { afterEach, describe, expect, it } from "vitest";
import {
  readOverlaySpeechPrefs,
  writeOverlaySpeechPrefs,
} from "../../src/lib/overlaySpeechPrefs";

describe("overlaySpeechPrefs", () => {
  afterEach(() => {
    localStorage.removeItem("treplica_overlay_speech_mode");
    localStorage.removeItem("treplica_overlay_source_language");
    localStorage.removeItem("treplica_overlay_target_language");
  });

  it("reads defaults when storage is empty", () => {
    expect(readOverlaySpeechPrefs()).toEqual({
      mode: "transcription",
      sourceLanguage: "auto",
      targetLanguage: "",
    });
  });

  it("round-trips written prefs", () => {
    writeOverlaySpeechPrefs({
      mode: "translation",
      sourceLanguage: "en",
      targetLanguage: "pt",
    });
    expect(readOverlaySpeechPrefs()).toEqual({
      mode: "translation",
      sourceLanguage: "en",
      targetLanguage: "pt",
    });
  });
});
