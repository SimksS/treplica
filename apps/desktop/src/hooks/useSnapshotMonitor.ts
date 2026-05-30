import { useCallback, useEffect, useState } from "react";

import { formatCaptureMonitorLabel } from "../lib/captureMonitor";
import * as api from "../lib/tauriClient";
import type { CaptureMonitorDto } from "../lib/types";

export function useSnapshotMonitor(sessionId: string | null) {
  const [monitors, setMonitors] = useState<CaptureMonitorDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listCaptureMonitors();
      setMonitors(list);
      const stored = await api.getSnapshotMonitor(sessionId);
      const fallback =
        list.find((m) => m.isPrimary)?.id ?? list[0]?.id ?? null;
      const next =
        stored != null && list.some((m) => m.id === stored)
          ? stored
          : fallback;
      setSelectedId(next);
      if (next != null && stored !== next && sessionId) {
        await api.setSnapshotMonitor(next, sessionId);
      }
    } catch {
      setMonitors([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectMonitor = useCallback(
    async (monitorId: number) => {
      setSelectedId(monitorId);
      await api.setSnapshotMonitor(monitorId, sessionId);
    },
    [sessionId],
  );

  const labels = monitors.map((m, i) => formatCaptureMonitorLabel(m, i));

  return {
    monitors,
    labels,
    selectedId,
    selectMonitor,
    loading,
    showPicker: monitors.length > 1,
    refresh,
  };
}
