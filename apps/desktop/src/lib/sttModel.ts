/** True when the connection model id is a speech-to-text (Whisper) model. */
export function isTranscriptionModelId(model: string | null | undefined): boolean {
  if (!model) return false;
  const m = model.toLowerCase();
  return m.includes("whisper") || m.includes("scribe") || m.includes("/stt");
}
