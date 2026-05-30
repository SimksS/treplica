import { useEffect, useState } from "react";
import {
  getSyncRuntimePlatform,
  resolveRuntimePlatform,
  type RuntimePlatformInfo,
} from "../lib/platform";

export function useRuntimePlatform(): RuntimePlatformInfo {
  const [platform, setPlatform] = useState<RuntimePlatformInfo>(getSyncRuntimePlatform);

  useEffect(() => {
    let active = true;
    void resolveRuntimePlatform().then((info) => {
      if (active) setPlatform(info);
    });
    return () => {
      active = false;
    };
  }, []);

  return platform;
}
