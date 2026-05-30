import { describe, expect, it } from "vitest";

import {
  blobHasMediaContainerHeader,
  normalizeMimeForWhisper,
} from "../../src/lib/audioChunk";

describe("normalizeMimeForWhisper", () => {
  it("strips codec parameters", () => {
    expect(normalizeMimeForWhisper("audio/webm;codecs=opus")).toBe("audio/webm");
  });
});

describe("blobHasMediaContainerHeader", () => {
  it("detects webm magic bytes", async () => {
    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
    const blob = new Blob([bytes]);
    expect(await blobHasMediaContainerHeader(blob)).toBe(true);
  });

  it("rejects empty header", async () => {
    const blob = new Blob([new Uint8Array([0, 1, 2, 3])]);
    expect(await blobHasMediaContainerHeader(blob)).toBe(false);
  });
});
