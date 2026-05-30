import { getRuntimePlatform } from "./tauriClient";

/** Runtime OS reported by the desktop shell (preferred) or inferred in the browser. */
export type OperatingSystem = "windows" | "macos" | "linux" | "unknown";

export interface RuntimePlatformInfo {
  os: OperatingSystem;
  displayName: string;
  usesCommandModifier: boolean;
}

export const CANONICAL_GUIDANCE_HOTKEY = "Ctrl+Shift+O";
export const CANONICAL_RECORD_HOTKEY = "Ctrl+D";

const OS_DISPLAY: Record<OperatingSystem, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  unknown: "seu sistema",
};

export function normalizeOperatingSystem(value: string | null | undefined): OperatingSystem {
  switch (value?.toLowerCase()) {
    case "windows":
      return "windows";
    case "macos":
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}

/** Browser fallback when Tauri is unavailable (e.g. component tests). */
export function detectOperatingSystemSync(): OperatingSystem {
  if (typeof navigator === "undefined") return "unknown";
  const platform = navigator.platform ?? "";
  const ua = navigator.userAgent ?? "";
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
  if (/Mac|iPhone|iPad|iPod/i.test(platform)) return "macos";
  if (/Linux/i.test(platform) || /X11/i.test(ua)) return "linux";
  return "unknown";
}

export function toRuntimePlatformInfo(os: OperatingSystem): RuntimePlatformInfo {
  return {
    os,
    displayName: OS_DISPLAY[os],
    usesCommandModifier: os === "macos",
  };
}

export function getSyncRuntimePlatform(): RuntimePlatformInfo {
  return toRuntimePlatformInfo(detectOperatingSystemSync());
}

let cachedPlatform: RuntimePlatformInfo | null = null;
let platformPromise: Promise<RuntimePlatformInfo> | null = null;

/** Resolves OS from Tauri when available, otherwise falls back to `navigator`. */
export async function resolveRuntimePlatform(): Promise<RuntimePlatformInfo> {
  if (cachedPlatform) return cachedPlatform;
  if (!platformPromise) {
    platformPromise = (async () => {
      try {
        const response = await getRuntimePlatform();
        if (response.ok && response.data) {
          const os = normalizeOperatingSystem(response.data.os);
          cachedPlatform = {
            os,
            displayName: response.data.display_name || OS_DISPLAY[os],
            usesCommandModifier: os === "macos",
          };
          return cachedPlatform;
        }
      } catch {
        /* browser / tests without Tauri */
      }
      cachedPlatform = getSyncRuntimePlatform();
      return cachedPlatform;
    })();
  }
  return platformPromise;
}

/** @deprecated Use `resolveRuntimePlatform` or `useRuntimePlatform`. */
export function isMacPlatform(): boolean {
  return (cachedPlatform?.os ?? detectOperatingSystemSync()) === "macos";
}

function formatForMac(hotkey: string): string {
  return hotkey
    .replace(/Ctrl\+/gi, "⌘")
    .replace(/Control\+/gi, "⌘")
    .replace(/Command\+/gi, "⌘")
    .replace(/Meta\+/gi, "⌘")
    .replace(/Shift\+/gi, "⇧")
    .replace(/Alt\+/gi, "⌥")
    .replace(/\+/g, "")
    .trim();
}

function formatForWindowsLike(hotkey: string): string {
  return hotkey
    .replace(/Command\+/gi, "Ctrl+")
    .replace(/Meta\+/gi, "Ctrl+")
    .replace(/⌘/g, "Ctrl+");
}

/** Human-readable shortcut for the current OS (e.g. Ctrl+Shift+O vs ⌘⇧O). */
export function formatSendShortcut(
  hotkey = CANONICAL_GUIDANCE_HOTKEY,
  platform?: RuntimePlatformInfo,
): string {
  const info = platform ?? cachedPlatform ?? getSyncRuntimePlatform();
  if (info.usesCommandModifier) {
    return formatForMac(hotkey);
  }
  return formatForWindowsLike(hotkey);
}

/** Hotkey string for `matchesHotkey` (Ctrl → Meta on macOS). */
export function hotkeyForEventMatching(
  hotkey: string,
  platform?: RuntimePlatformInfo,
): string {
  const info = platform ?? cachedPlatform ?? getSyncRuntimePlatform();
  if (!info.usesCommandModifier) return hotkey;
  return hotkey
    .replace(/Ctrl\+/gi, "Meta+")
    .replace(/Control\+/gi, "Meta+");
}

export function sendShortcutParts(
  hotkey = CANONICAL_GUIDANCE_HOTKEY,
  platform?: RuntimePlatformInfo,
): { mod: string; key: string } {
  const label = formatSendShortcut(hotkey, platform);
  const info = platform ?? cachedPlatform ?? getSyncRuntimePlatform();
  if (info.usesCommandModifier) {
    const match = label.match(/^(⌘)(.+)$/);
    if (match) {
      return { mod: match[1]!, key: match[2]! };
    }
  }
  const parts = label.split("+");
  if (parts.length >= 2) {
    return { mod: parts[0]!, key: parts.slice(1).join("+") };
  }
  return {
    mod: info.usesCommandModifier ? "⌘" : "Ctrl",
    key: "D",
  };
}

export interface SetupScreenPermissionCopy {
  lead: string;
  confirmHint: string;
  settingsHint: string;
}

export function setupScreenPermissionCopy(
  platform?: RuntimePlatformInfo,
): SetupScreenPermissionCopy {
  const os = platform?.os ?? cachedPlatform?.os ?? detectOperatingSystemSync();
  switch (os) {
    case "macos":
      return {
        lead:
          "Para capturar áudio de reuniões (Meet, Teams, Zoom), o macOS pode pedir permissão de gravação de tela ou áudio do sistema na primeira captura.",
        confirmHint:
          "Marque quando já tiver autorizado em Ajustes do Sistema",
        settingsHint:
          "Ajustes do Sistema → Privacidade e Segurança → Gravação de tela",
      };
    case "linux":
      return {
        lead:
          "Para capturar áudio de reuniões, o ambiente de desktop pode pedir permissão de tela ou áudio do sistema na primeira gravação.",
        confirmHint:
          "Marque quando já tiver autorizado nas configurações do sistema",
        settingsHint:
          "Verifique permissões de tela/áudio no painel do seu ambiente (Wayland/PipeWire).",
      };
    default:
      return {
        lead:
          "Para capturar áudio de reuniões (Meet, Teams, Zoom), o Windows pode pedir permissão de captura de tela ou áudio do sistema na primeira gravação.",
        confirmHint:
          "Marque quando já tiver autorizado nas configurações do Windows",
        settingsHint:
          "Configurações → Privacidade → Captura de tela (Windows 11)",
      };
  }
}

/** Clears cached platform (tests). */
export function resetRuntimePlatformCache(): void {
  cachedPlatform = null;
  platformPromise = null;
}

/** Prefetch from Tauri during app boot. */
export function prefetchRuntimePlatform(): void {
  void resolveRuntimePlatform();
}
