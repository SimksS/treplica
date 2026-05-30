import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuidancePanel } from "../../src/features/live-session/GuidancePanel";
import { TranscriptStream } from "../../src/features/live-session/TranscriptStream";
import { fixtureSuggestions, fixtureTranscripts } from "../fixtures/session-fixtures";

describe("Live session UI", () => {
  it("shows empty transcript state", () => {
    render(<TranscriptStream segments={[]} />);
    expect(screen.getByTestId("transcript-empty")).toBeInTheDocument();
  });

  it("renders transcript segments", () => {
    render(<TranscriptStream segments={fixtureTranscripts} />);
    expect(screen.getAllByTestId("transcript-item")).toHaveLength(1);
    expect(screen.getByText(/ROI esperado/)).toBeInTheDocument();
  });

  it("renders guidance with low confidence label", () => {
    render(
      <GuidancePanel
        suggestions={[
          { ...fixtureSuggestions[0], confidence: 0.4 },
        ]}
        onCopy={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByTestId("low-confidence")).toBeInTheDocument();
  });

  it("shows empty guidance state", () => {
    render(<GuidancePanel suggestions={[]} onCopy={() => {}} onSave={() => {}} />);
    expect(screen.getByTestId("guidance-empty")).toBeInTheDocument();
  });
});
