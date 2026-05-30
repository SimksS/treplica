import { describe, expect, it } from "vitest";
import {
  extractNewSpeechSegment,
  mergeCommittedTranscript,
} from "../../src/lib/speechRecognitionDelta";

describe("extractNewSpeechSegment", () => {
  it("returns full text when nothing committed", () => {
    expect(extractNewSpeechSegment("", "olá mundo")).toBe("olá mundo");
  });

  it("returns suffix for cumulative finals", () => {
    expect(extractNewSpeechSegment("olá", "olá mundo")).toBe("mundo");
  });

  it("returns phrase-only finals", () => {
    expect(extractNewSpeechSegment("olá", "mundo")).toBe("mundo");
  });

  it("skips duplicate finals", () => {
    expect(extractNewSpeechSegment("olá mundo", "olá mundo")).toBe("");
    expect(extractNewSpeechSegment("olá mundo", "mundo")).toBe("");
  });
});

describe("mergeCommittedTranscript", () => {
  it("merges phrase-only segments", () => {
    expect(mergeCommittedTranscript("olá", "mundo")).toBe("olá mundo");
  });

  it("replaces with cumulative payload", () => {
    expect(mergeCommittedTranscript("olá", "olá mundo")).toBe("olá mundo");
  });
});
