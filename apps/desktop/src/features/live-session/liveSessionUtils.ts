import type { SessionStatus } from "../../lib/types";

/** Statuses that appear as "em andamento" no histórico. */
export const ACTIVE_LIVE_SESSION_STATUSES: SessionStatus[] = [
  "listening",
  "paused",
  "reconnecting",
  "draft",
];

export function isActiveLiveSessionStatus(status: SessionStatus | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_LIVE_SESSION_STATUSES.includes(status);
}

export function isActiveLiveSession(
  sessionId: string | null | undefined,
  status: SessionStatus | null | undefined,
): boolean {
  return Boolean(sessionId) && isActiveLiveSessionStatus(status);
}
