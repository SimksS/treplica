import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SetupWizard } from "../../src/features/setup/SetupWizard";

vi.mock("../../src/lib/tauriClient", () => ({
  unwrap: (r: { ok: boolean; data?: unknown }) => {
    if (!r.ok) throw new Error("fail");
    return r.data;
  },
  getOnboardingState: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      completed: false,
      microphone_permission_granted: false,
      screen_permission_granted: false,
      transcription_language_mode: "auto",
      transcription_language_custom: null,
      send_transcript_hotkey: "Ctrl+D",
    },
  }),
  updateOnboardingState: vi.fn().mockImplementation(async (input) => ({
    ok: true,
    data: {
      completed: false,
      microphone_permission_granted: input.microphone_permission_granted ?? false,
      screen_permission_granted: input.screen_permission_granted ?? false,
      transcription_language_mode: input.transcription_language_mode ?? "auto",
      transcription_language_custom: input.transcription_language_custom ?? null,
      send_transcript_hotkey: "Ctrl+D",
    },
  })),
  completeOnboarding: vi.fn().mockResolvedValue({
    ok: true,
    data: { completed: true },
  }),
  runSetupAiTest: vi.fn(),
}));

describe("Setup wizard", () => {
  it("renders welcome step", async () => {
    render(<SetupWizard onComplete={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId("setup-wizard")).toBeInTheDocument();
      expect(screen.getByTestId("setup-step-welcome")).toBeInTheDocument();
    });
  });
});
