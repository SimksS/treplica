/** MIME type sent to Whisper-compatible APIs (no codec suffix). */
export function normalizeMimeForWhisper(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "audio/webm";
  if (m.includes("ogg")) return "audio/ogg";
  if (m.includes("mp4") || m.includes("m4a")) return "audio/mp4";
  if (m.includes("wav")) return "audio/wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "audio/mpeg";
  const base = mime.split(";")[0]?.trim();
  return base || "audio/webm";
}

/** Prefer audio-only containers; avoid video/webm for mic/system-audio streams. */
export function pickRecorderOptions(
  stream: MediaStream,
): { mimeType?: string } | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  const audioOnly = stream.getVideoTracks().length === 0;
  const candidates = audioOnly
    ? ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
    : [
        "audio/webm;codecs=opus",
        "audio/webm",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType };
    }
  }
  return undefined;
}

async function readBlobHead(blob: Blob, length: number): Promise<Uint8Array> {
  const slice = blob.slice(0, length);
  if (typeof slice.arrayBuffer === "function") {
    return new Uint8Array(await slice.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("falha ao ler cabeçalho do áudio"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("falha ao ler cabeçalho do áudio"));
    reader.readAsArrayBuffer(slice);
  });
}

/** Quick check that bytes look like a complete media file (not a raw timeslice fragment). */
export async function blobHasMediaContainerHeader(blob: Blob): Promise<boolean> {
  const head = await readBlobHead(blob, 12);
  if (head.length < 4) return false;
  // WebM / Matroska
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return true;
  }
  // Ogg
  if (head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67 && head[3] === 0x53) {
    return true;
  }
  // WAV RIFF
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46) {
    return true;
  }
  // MP3 ID3
  if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
    return true;
  }
  // MP3 frame sync
  if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) {
    return true;
  }
  // MP4/M4A ftyp at offset 4
  if (
    head.length >= 8 &&
    head[4] === 0x66 &&
    head[5] === 0x74 &&
    head[6] === 0x79 &&
    head[7] === 0x70
  ) {
    return true;
  }
  return false;
}
