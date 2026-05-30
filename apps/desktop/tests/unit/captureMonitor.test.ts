import { describe, expect, it } from "vitest";

import { formatCaptureMonitorLabel } from "../../src/lib/captureMonitor";
import type { CaptureMonitorDto } from "../../src/lib/types";

const base: CaptureMonitorDto = {
  id: 1,
  name: "\\\\.\\DISPLAY1",
  width: 1920,
  height: 1080,
  isPrimary: true,
  x: 0,
  y: 0,
};

describe("formatCaptureMonitorLabel", () => {
  it("marks primary display", () => {
    expect(formatCaptureMonitorLabel(base, 0)).toContain("Principal");
  });

  it("numbers secondary displays", () => {
    expect(
      formatCaptureMonitorLabel({ ...base, isPrimary: false, id: 2 }, 1),
    ).toMatch(/^Tela 2/);
  });
});
