import { describe, expect, it } from "vitest";
import { isRecoverableCloudSttFailure } from "../../src/lib/sttErrors";

describe("isRecoverableCloudSttFailure", () => {
  it("detects payment required code", () => {
    expect(
      isRecoverableCloudSttFailure("transcription_payment_required", ""),
    ).toBe(true);
  });

  it("detects 402 in message", () => {
    expect(
      isRecoverableCloudSttFailure(
        "transcription_error",
        "OpenRouter transcription 402 Payment Required",
      ),
    ).toBe(true);
  });
});
