import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionDetailTabs } from "../../src/features/history/SessionDetailTabs";
import { fixtureSessionDetail } from "../fixtures/history-fixtures";

describe("SessionDetailTabs", () => {
  const noop = vi.fn();

  it("shows transcript chat by default", () => {
    render(
      <SessionDetailTabs
        detail={fixtureSessionDetail}
        loading={false}
        onGenerate={noop}
        onExport={noop}
        onCopy={noop}
        onDeleteDoc={noop}
      />,
    );
    expect(screen.getByTestId("history-transcript-chat")).toBeInTheDocument();
    expect(screen.getByText("Qual o ROI?")).toBeInTheDocument();
    expect(screen.getByTestId("history-chat-translation")).toHaveTextContent(
      "Qual é o ROI?",
    );
  });

  it("switches to context tab with pre-meeting briefing", () => {
    render(
      <SessionDetailTabs
        detail={fixtureSessionDetail}
        loading={false}
        onGenerate={noop}
        onExport={noop}
        onCopy={noop}
        onDeleteDoc={noop}
      />,
    );
    fireEvent.click(screen.getByTestId("session-tab-context"));
    expect(screen.getByTestId("history-context-panel")).toBeInTheDocument();
    expect(screen.getByTestId("history-pre-meeting-text")).toHaveTextContent(
      "Briefing da reunião",
    );
  });

  it("switches to guidance tab", () => {
    render(
      <SessionDetailTabs
        detail={fixtureSessionDetail}
        loading={false}
        onGenerate={noop}
        onExport={noop}
        onCopy={noop}
        onDeleteDoc={noop}
      />,
    );
    fireEvent.click(screen.getByTestId("session-tab-guidance"));
    expect(screen.getByTestId("history-guidance-tab")).toBeInTheDocument();
    expect(screen.getByText("Destaque payback")).toBeInTheDocument();
    expect(screen.getByText(/Cliente perguntou sobre ROI/)).toBeInTheDocument();
  });

  it("switches to translations tab", () => {
    render(
      <SessionDetailTabs
        detail={fixtureSessionDetail}
        loading={false}
        onGenerate={noop}
        onExport={noop}
        onCopy={noop}
        onDeleteDoc={noop}
      />,
    );
    fireEvent.click(screen.getByTestId("session-tab-translations"));
    expect(screen.getByTestId("history-translations-tab")).toBeInTheDocument();
    expect(screen.getByText("Qual é o ROI?")).toBeInTheDocument();
  });

  it("switches to audit tab with provider calls", () => {
    render(
      <SessionDetailTabs
        detail={fixtureSessionDetail}
        loading={false}
        onGenerate={noop}
        onExport={noop}
        onCopy={noop}
        onDeleteDoc={noop}
      />,
    );
    fireEvent.click(screen.getByTestId("session-tab-audit"));
    expect(screen.getByTestId("history-audit-tab")).toBeInTheDocument();
    expect(screen.getByTestId("history-provider-call")).toHaveTextContent(
      "guidance",
    );
  });
});
