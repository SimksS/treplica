import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuidancePanel } from "../../src/features/live-session/GuidancePanel";
import { fixtureSuggestionsMixed } from "../fixtures/session-fixtures";

describe("Guidance categories", () => {
  it("renders category filters", () => {
    render(
      <GuidancePanel
        suggestions={fixtureSuggestionsMixed}
        onCopy={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByTestId("guidance-filters")).toBeInTheDocument();
    expect(screen.getByTestId("filter-objection_response")).toBeInTheDocument();
    expect(screen.getByTestId("filter-follow_up_question")).toBeInTheDocument();
  });

  it("filters objection suggestions", () => {
    render(
      <GuidancePanel
        suggestions={fixtureSuggestionsMixed}
        onCopy={() => {}}
        onSave={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("filter-objection_response"));
    const items = screen.getAllByTestId("guidance-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent(/destaque ROI/i);
  });

  it("shows next steps block", () => {
    render(
      <GuidancePanel
        suggestions={fixtureSuggestionsMixed}
        onCopy={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByTestId("next-steps-block")).toBeInTheDocument();
    expect(screen.getByTestId("next-step-item")).toBeInTheDocument();
  });

  it("displays human-readable category label", () => {
    render(
      <GuidancePanel
        suggestions={[fixtureSuggestionsMixed[2]]}
        onCopy={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByTestId("guidance-type")).toHaveTextContent("Follow-up");
  });
});
