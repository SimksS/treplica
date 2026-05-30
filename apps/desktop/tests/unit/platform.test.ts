import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectOperatingSystemSync,
  formatSendShortcut,
  hotkeyForEventMatching,
  normalizeOperatingSystem,
  resetRuntimePlatformCache,
  setupScreenPermissionCopy,
} from "../../src/lib/platform";

describe("platform", () => {
  afterEach(() => {
    resetRuntimePlatformCache();
    vi.unstubAllGlobals();
  });

  it("normalizes OS ids from the backend", () => {
    expect(normalizeOperatingSystem("macos")).toBe("macos");
    expect(normalizeOperatingSystem("darwin")).toBe("macos");
    expect(normalizeOperatingSystem("windows")).toBe("windows");
  });

  it("formats guidance hotkey for macOS", () => {
    const mac = { os: "macos" as const, displayName: "macOS", usesCommandModifier: true };
    expect(formatSendShortcut("Ctrl+Shift+O", mac)).toBe("⌘⇧O");
    expect(formatSendShortcut("Ctrl+D", mac)).toBe("⌘D");
  });

  it("formats guidance hotkey for Windows", () => {
    const win = {
      os: "windows" as const,
      displayName: "Windows",
      usesCommandModifier: false,
    };
    expect(formatSendShortcut("Ctrl+Shift+O", win)).toBe("Ctrl+Shift+O");
  });

  it("maps Ctrl to Meta for keyboard matching on macOS", () => {
    const mac = { os: "macos" as const, displayName: "macOS", usesCommandModifier: true };
    expect(hotkeyForEventMatching("Ctrl+Shift+O", mac)).toBe("Meta+Shift+O");
  });

  it("returns macOS-specific setup copy", () => {
    const copy = setupScreenPermissionCopy({
      os: "macos",
      displayName: "macOS",
      usesCommandModifier: true,
    });
    expect(copy.settingsHint).toContain("Ajustes do Sistema");
  });

  it("detects Windows from navigator when available", () => {
    vi.stubGlobal("navigator", {
      platform: "Win32",
      userAgent: "Windows NT 10.0",
    });
    expect(detectOperatingSystemSync()).toBe("windows");
  });
});
