/** Normalizes backend/UI audio level to 0–1 (guards NaN and legacy camelCase payloads). */
export function normalizeAudioLevel(
  dto: { audio_level?: unknown; audioLevel?: unknown } | null | undefined,
): number {
  const raw = dto?.audio_level ?? dto?.audioLevel;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function audioLevelPercent(level: number): number {
  const n = Number.isFinite(level) ? level : 0;
  return Math.round(Math.max(0, Math.min(1, n)) * 100);
}
