import { describe, expect, it } from "vitest";
import {
  isPreflightRecordingQualityOk,
  isPreflightRecordingUsable,
} from "../../src/lib/preflightAudioTest";

describe("preflightAudioTest", () => {
  it("requires minimum size and peak when signal is required", () => {
    expect(isPreflightRecordingQualityOk(500, 0.05, true)).toBe(true);
    expect(isPreflightRecordingQualityOk(100, 0.05, true)).toBe(false);
    expect(isPreflightRecordingQualityOk(500, 0.01, true)).toBe(false);
  });

  it("skips peak check when signal is not required", () => {
    expect(isPreflightRecordingQualityOk(500, 0, false)).toBe(true);
  });

  it("wraps blob size check", () => {
    const blob = new Blob([new Uint8Array(500)]);
    expect(isPreflightRecordingUsable(blob, 0.04, true)).toBe(true);
  });
});
