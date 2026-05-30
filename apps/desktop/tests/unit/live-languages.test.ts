import { describe, expect, it } from "vitest";
import {
  isTranslationModeReady,
  resolveWhisperSourceLanguage,
} from "../../src/lib/liveLanguages";

describe("liveLanguages", () => {
  it("resolveWhisperSourceLanguage returns null for auto", () => {
    expect(resolveWhisperSourceLanguage("auto")).toBeNull();
    expect(resolveWhisperSourceLanguage("")).toBeNull();
  });

  it("resolveWhisperSourceLanguage normalizes locale", () => {
    expect(resolveWhisperSourceLanguage("pt-BR")).toBe("pt");
  });

  it("isTranslationModeReady blocks translation without target", () => {
    expect(isTranslationModeReady("transcription", "")).toBe(true);
    expect(isTranslationModeReady("translation", "")).toBe(false);
    expect(isTranslationModeReady("translation", "en")).toBe(true);
  });
});
