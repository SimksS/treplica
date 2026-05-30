import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiTypingIndicator } from "../../src/components/AiTypingIndicator";
import { GuidancePanel } from "../../src/features/live-session/GuidancePanel";

describe("AiTypingIndicator", () => {
  it("renders chat-style typing bubble", () => {
    render(<AiTypingIndicator label="Gerando orientação com IA" />);
    expect(screen.getByTestId("ai-typing-indicator")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gerando orientação com IA");
  });
});

describe("GuidancePanel typing state", () => {
  it("shows typing indicator while AI is pending", () => {
    render(
      <GuidancePanel
        suggestions={[]}
        isTyping
        onCopy={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByTestId("guidance-typing-indicator")).toBeInTheDocument();
    expect(screen.queryByTestId("guidance-empty")).not.toBeInTheDocument();
  });
});
