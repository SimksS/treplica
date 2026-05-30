import { describe, expect, it } from "vitest";

import {
  MAX_SEGMENT_MS,
  MIN_SEGMENT_MS,
  ROLLING_FLUSH_MS,
  SILENCE_END_MS,
  SPEECH_LEVEL_THRESHOLD,
  vadSegmentAction,
} from "../../src/lib/speechVad";

describe("vadSegmentAction", () => {
  const t0 = 1000;

  it("starts when speech detected and idle", () => {
    expect(
      vadSegmentAction({
        level: SPEECH_LEVEL_THRESHOLD + 0.01,
        isRecording: false,
        segmentStartedAt: null,
        silenceStartedAt: null,
        now: t0,
      }),
    ).toBe("start_segment");
  });

  it("ends after pause following speech", () => {
    const start = t0;
    const silenceStart = t0 + 2000;
    const now = silenceStart + SILENCE_END_MS + 50;
    expect(
      vadSegmentAction({
        level: 0,
        isRecording: true,
        segmentStartedAt: start,
        silenceStartedAt: silenceStart,
        now,
      }),
    ).toBe("end_segment");
  });

  it("does not end before min segment duration even if silence is long enough", () => {
    // Silence has exceeded SILENCE_END_MS but segment is still under MIN_SEGMENT_MS.
    expect(
      vadSegmentAction({
        level: 0,
        isRecording: true,
        segmentStartedAt: t0,
        silenceStartedAt: t0 + 100,
        now: t0 + MIN_SEGMENT_MS - 50,
      }),
    ).toBe("none");
  });

  it("rolling flush during continuous speech", () => {
    expect(
      vadSegmentAction({
        level: SPEECH_LEVEL_THRESHOLD + 0.05,
        isRecording: true,
        segmentStartedAt: t0,
        silenceStartedAt: null,
        now: t0 + ROLLING_FLUSH_MS + 1,
      }),
    ).toBe("rolling_flush");
  });

  it("forces end at max segment length", () => {
    expect(
      vadSegmentAction({
        level: SPEECH_LEVEL_THRESHOLD,
        isRecording: true,
        segmentStartedAt: t0,
        silenceStartedAt: null,
        now: t0 + MAX_SEGMENT_MS + 1,
      }),
    ).toBe("end_segment");
  });
});
