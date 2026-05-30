import type { CaptureMonitorDto } from "./types";

/** Human-readable label for a display in the snapshot picker. */
export function formatCaptureMonitorLabel(
  monitor: CaptureMonitorDto,
  index: number,
): string {
  const role = monitor.isPrimary ? "Principal" : `Tela ${index + 1}`;
  const name = monitor.name?.trim();
  const size = `${monitor.width}×${monitor.height}`;
  if (name) {
    return `${role} · ${name} (${size})`;
  }
  return `${role} (${size})`;
}
