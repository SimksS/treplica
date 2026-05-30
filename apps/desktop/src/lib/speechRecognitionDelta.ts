/**
 * Web Speech (continuous) may return cumulative finals or phrase-only finals.
 * These helpers extract only the new text to ingest per event.
 */

/** Returns the portion of `incoming` not yet covered by `committed`. */
export function extractNewSpeechSegment(
  committed: string,
  incoming: string,
): string {
  const c = committed.trim();
  const n = incoming.trim();
  if (!n) return "";
  if (!c) return n;
  if (n === c) return "";
  if (n.startsWith(c)) {
    return n.slice(c.length).trim();
  }
  if (c.endsWith(n) || c.endsWith(` ${n}`)) {
    return "";
  }
  return n;
}

/** Merges a final recognition payload into the committed transcript buffer. */
export function mergeCommittedTranscript(
  committed: string,
  incoming: string,
): string {
  const c = committed.trim();
  const n = incoming.trim();
  if (!n) return c;
  if (!c) return n;
  if (n.startsWith(c)) return n;
  if (c.endsWith(n) || c.endsWith(` ${n}`)) return c;
  return `${c} ${n}`.trim();
}
