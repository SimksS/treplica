import { pickRecorderOptions } from "./audioChunk";

export interface PreflightRecordingResult {
  blobUrl: string;
  peakLevel: number;
  blob: Blob;
  revoke: () => void;
}

const MIN_RECORDING_BYTES = 400;

export function isPreflightRecordingQualityOk(
  blobSize: number,
  peakLevel: number,
  requireSignal: boolean,
): boolean {
  if (blobSize < MIN_RECORDING_BYTES) return false;
  if (!requireSignal) return true;
  return peakLevel > 0.02;
}

export function isPreflightRecordingUsable(
  blob: Blob,
  peakLevel: number,
  requireSignal: boolean,
): boolean {
  return isPreflightRecordingQualityOk(blob.size, peakLevel, requireSignal);
}

export async function recordStreamWithMeter(
  stream: MediaStream,
  durationMs: number,
  onLevel?: (level: number) => void,
): Promise<PreflightRecordingResult> {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const chunks: Blob[] = [];
  const options = pickRecorderOptions(stream);
  const recorder = options
    ? new MediaRecorder(stream, options)
    : new MediaRecorder(stream);

  let peak = 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  const started = performance.now();

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const meterLoop = () => {
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
    const level = Math.min(1, avg / 128);
    peak = Math.max(peak, level);
    onLevel?.(level);
    if (performance.now() - started < durationMs) {
      raf = requestAnimationFrame(meterLoop);
    }
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  meterLoop();

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

  if (recorder.state !== "inactive") {
    recorder.stop();
  }
  await stopped;

  cancelAnimationFrame(raf);
  source.disconnect();
  await ctx.close();

  const blob = new Blob(chunks, {
    type: recorder.mimeType || "audio/webm",
  });
  const blobUrl = URL.createObjectURL(blob);

  return {
    blobUrl,
    peakLevel: peak,
    blob,
    revoke: () => URL.revokeObjectURL(blobUrl),
  };
}
