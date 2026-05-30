import { useEffect, useRef } from "react";

import type { UnlistenFn } from "@tauri-apps/api/event";

export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/** Registers a Tauri event listener; no-op in Vitest / plain browser. */
export async function listenWhenTauri<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<UnlistenFn | undefined> {
  if (!isTauriRuntime()) return undefined;
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (e) => handler(e.payload));
}

/**
 * Subscribes to a Tauri event once per mount (or when `enabled` flips).
 * Handler always sees the latest callback without re-calling `listen()`.
 */
export function useTauriListen<T>(
  event: string,
  handler: (payload: T) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !isTauriRuntime()) return;

    let cancelled = false;
    let unlisten: UnlistenFn | undefined;

    void (async () => {
      const fn = await listenWhenTauri<T>(event, (payload) => {
        handlerRef.current(payload);
      });
      if (cancelled) {
        fn?.();
        return;
      }
      unlisten = fn;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [event, enabled]);
}
