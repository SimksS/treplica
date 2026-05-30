import { describe, expect, it } from "vitest";
import {
  isActiveLiveSession,
  isActiveLiveSessionStatus,
} from "../../src/features/live-session/liveSessionUtils";

describe("liveSessionUtils", () => {
  it("detects active statuses", () => {
    expect(isActiveLiveSessionStatus("listening")).toBe(true);
    expect(isActiveLiveSessionStatus("paused")).toBe(true);
    expect(isActiveLiveSessionStatus("ended")).toBe(false);
  });

  it("requires session id and active status", () => {
    expect(isActiveLiveSession("s1", "listening")).toBe(true);
    expect(isActiveLiveSession(null, "listening")).toBe(false);
    expect(isActiveLiveSession("s1", "ended")).toBe(false);
  });
});
