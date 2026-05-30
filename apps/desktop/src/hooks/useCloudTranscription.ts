import { useCallback, useEffect, useState } from "react";

import * as api from "../lib/tauriClient";
import { unwrap } from "../lib/tauriClient";
import { isTauriRuntime } from "../lib/tauriEvents";

export interface CloudTranscriptionState {
  loaded: boolean;
  /** Provider configured with API key (static check). */
  configured: boolean;
  /** Configured and not suspended after a runtime failure (402, auth, etc.). */
  usable: boolean;
  providerId?: string;
  providerDisplayName?: string;
  /** Whisper model id used for STT (may differ from connection chat model). */
  sttModel?: string;
  connectionModel?: string;
  sttModelIsFallback?: boolean;
  suspendReason?: string;
}

const initial: CloudTranscriptionState = {
  loaded: false,
  configured: false,
  usable: false,
};

/** Hosted Whisper STT availability; can be suspended after billing/auth errors at runtime. */
export function useCloudTranscription() {
  const [state, setState] = useState<CloudTranscriptionState>(initial);

  const refresh = useCallback(async () => {
    if (!isTauriRuntime()) {
      setState({ loaded: true, configured: false, usable: false });
      return;
    }
    try {
      const dto = unwrap(await api.getTranscriptionAvailability());
      const configured = dto.cloud_available;
      setState((prev) => ({
        loaded: true,
        configured,
        usable: configured && !prev.suspendReason,
        providerId: dto.provider_id ?? undefined,
        providerDisplayName: dto.provider_display_name ?? undefined,
        sttModel: dto.stt_model ?? undefined,
        connectionModel: dto.connection_model ?? undefined,
        sttModelIsFallback: dto.stt_model_is_fallback ?? false,
        suspendReason: prev.suspendReason,
      }));
    } catch {
      setState({ loaded: true, configured: false, usable: false });
    }
  }, []);

  const suspend = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      usable: false,
      suspendReason: reason,
    }));
  }, []);

  const resetSuspension = useCallback(() => {
    setState((prev) => ({
      ...prev,
      usable: prev.configured,
      suspendReason: undefined,
    }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    /** @deprecated use `configured` or `usable` */
    available: state.usable,
    refresh,
    suspend,
    resetSuspension,
  };
}
