import { useCallback, useEffect, useState } from "react";

import * as api from "../lib/tauriClient";
import { isTauriRuntime } from "../lib/tauriEvents";

/**
 * Reads (and optionally toggles) the macOS native on-device speech-recognition
 * setting. `ready` means the platform supports it (macOS) AND the user enabled
 * it — i.e. the mic can transcribe without a cloud STT provider.
 */
export function useMacNativeSpeech() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(!isTauriRuntime());

  const refresh = useCallback(async () => {
    if (!isTauriRuntime()) {
      setLoaded(true);
      return;
    }
    try {
      const ok = await api.nativeSpeechSupported();
      setSupported(ok);
      if (ok) {
        const res = await api.getMacosNativeSpeech();
        setEnabled(res.ok ? Boolean(res.data) : false);
      } else {
        setEnabled(false);
      }
    } catch {
      setSupported(false);
      setEnabled(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setEnabledPersist = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (!isTauriRuntime()) return false;
      const res = await api.setMacosNativeSpeech(next);
      const stored = res.ok ? Boolean(res.data) : enabled;
      setEnabled(stored);
      return stored;
    },
    [enabled],
  );

  return {
    supported,
    enabled,
    loaded,
    ready: supported && enabled,
    refresh,
    setEnabled: setEnabledPersist,
  };
}
