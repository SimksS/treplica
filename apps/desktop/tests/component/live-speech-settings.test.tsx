import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveSpeechSettings } from "../../src/features/live-session/LiveSpeechSettings";

describe("LiveSpeechSettings", () => {
  it("shows target selector only in translation mode", () => {
    const { rerender } = render(
      <LiveSpeechSettings
        mode="transcription"
        sourceLanguage="auto"
        targetLanguage=""
        onModeChange={vi.fn()}
        onSourceChange={vi.fn()}
        onTargetChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("speech-target-language")).not.toBeInTheDocument();

    rerender(
      <LiveSpeechSettings
        mode="translation"
        sourceLanguage="pt"
        targetLanguage=""
        onModeChange={vi.fn()}
        onSourceChange={vi.fn()}
        onTargetChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("speech-target-language")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("fires mode and language changes", () => {
    const onModeChange = vi.fn();
    const onTargetChange = vi.fn();
    render(
      <LiveSpeechSettings
        mode="transcription"
        sourceLanguage="auto"
        targetLanguage=""
        onModeChange={onModeChange}
        onSourceChange={vi.fn()}
        onTargetChange={onTargetChange}
      />,
    );
    fireEvent.click(screen.getByTestId("speech-mode-translation"));
    expect(onModeChange).toHaveBeenCalledWith("translation");

    fireEvent.change(screen.getByTestId("speech-source-language"), {
      target: { value: "en" },
    });
  });
});
