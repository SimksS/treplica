import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { matchesHotkey } from "../lib/hotkey";
import { hotkeyForEventMatching } from "../lib/platform";
import { useRuntimePlatform } from "./useRuntimePlatform";

/**
 * Blocks WebView default shortcuts (e.g. Ctrl+D find) and invokes guidance.
 */
export function useGuidanceHotkey(
  hotkey: string,
  onTrigger: () => void,
  enabled = true,
) {
  const platform = useRuntimePlatform();
  const matchHotkey = hotkeyForEventMatching(hotkey, platform);

  useEffect(() => {
    if (!enabled || !hotkey) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesHotkey(event, matchHotkey)) return;
      event.preventDefault();
      event.stopPropagation();
      onTrigger();
    };

    window.addEventListener("keydown", onKeyDown, true);

    const unlistenPromise = listen("send-transcript-hotkey", () => {
      onTrigger();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [hotkey, matchHotkey, onTrigger, enabled]);
}
