/** Level (0–1) above which we consider the input as speech. */
export const SPEECH_LEVEL_THRESHOLD = 0.028;

/** Silence duration after speech before closing a segment (ms).
 *  500 ms handles natural breath pauses without cutting mid-word. */
export const SILENCE_END_MS = 500;

/** Minimum segment length to send after a pause (ms).
 *  800 ms ensures enough audio context for reliable Whisper output. */
export const MIN_SEGMENT_MS = 800;

/** While speech continues, send a rolling chunk every N ms (near-real-time).
 *  4 s matches the native system-audio capture cadence and keeps latency low
 *  without exceeding the API rate limiter (~15 req/min during continuous speech). */
export const ROLLING_FLUSH_MS = 4_000;

/** Hard cap per segment if no pause is detected (ms).
 *  8 s limits maximum latency and aligns with the native capture ceiling. */
export const MAX_SEGMENT_MS = 8_000;

/** Minimum spacing between cloud STT API calls (ms) — ~18 req/min.
 *  Matches the backend SttRateLimiter so queued blobs don't bounce. */
export const MIN_STT_INTERVAL_MS = 3_200;

export type VadSegmentAction = "none" | "start_segment" | "rolling_flush" | "end_segment";

/**
 * Decides whether to start, roll, or end a speech segment from level + timing.
 * Pure function for testing.
 */
export function vadSegmentAction(input: {
  level: number;
  isRecording: boolean;
  segmentStartedAt: number | null;
  silenceStartedAt: number | null;
  now: number;
}): VadSegmentAction {
  const { level, isRecording, segmentStartedAt, silenceStartedAt, now } = input;
  const speaking = level >= SPEECH_LEVEL_THRESHOLD;

  if (!isRecording) {
    return speaking ? "start_segment" : "none";
  }

  const segmentDur =
    segmentStartedAt != null ? now - segmentStartedAt : 0;

  if (segmentDur >= MAX_SEGMENT_MS) {
    return "end_segment";
  }

  if (speaking && segmentDur >= ROLLING_FLUSH_MS) {
    return "rolling_flush";
  }

  if (speaking) {
    return "none";
  }

  if (silenceStartedAt == null) {
    return "none";
  }

  const silenceDur = now - silenceStartedAt;
  if (silenceDur >= SILENCE_END_MS && segmentDur >= MIN_SEGMENT_MS) {
    return "end_segment";
  }

  return "none";
}

export function shouldMarkSilenceStart(
  level: number,
  isRecording: boolean,
  silenceStartedAt: number | null,
): boolean {
  return (
    isRecording &&
    level < SPEECH_LEVEL_THRESHOLD &&
    silenceStartedAt == null
  );
}
