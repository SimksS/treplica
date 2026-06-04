import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

import { matchesHotkey } from "../lib/hotkey";
import { hotkeyForEventMatching } from "../lib/platform";
import { useRuntimePlatform } from "./useRuntimePlatform";

/**
 * Blocks WebView default shortcuts (e.g. Ctrl+D find) and invokes guidance.
 *
 * The Rust global shortcut emits `send-transcript-hotkey`; we also catch the raw
 * keydown for when the WebView is focused. The actual work runs through `onTrigger`.
 */
export function useGuidanceHotkey(
  hotkey: string,
  onTrigger: () => void,
  enabled = true,
) {
  const platform = useRuntimePlatform();
  const matchHotkey = hotkeyForEventMatching(hotkey, platform);

  // Keep the latest callback in a ref so the keydown/event subscription does not
  // need to be torn down and recreated on every render. The overlay re-renders
  // constantly (audio meters, animations) and `onTrigger` typically changes
  // identity each render; without this, the async `listen` subscription churns
  // and the global-shortcut event can arrive while no native listener is
  // attached — making the hotkey silently do nothing in the overlay.
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled || !hotkey) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesHotkey(event, matchHotkey)) return;
      event.preventDefault();
      event.stopPropagation();
      onTriggerRef.current();
    };

    window.addEventListener("keydown", onKeyDown, true);

    const unlistenPromise = listen("send-transcript-hotkey", () => {
      onTriggerRef.current();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [matchHotkey, hotkey, enabled]);
}
