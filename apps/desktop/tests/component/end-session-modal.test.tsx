import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EndSessionConfirmModal } from "../../src/components/EndSessionConfirmModal";

describe("EndSessionConfirmModal", () => {
  it("calls handlers for each action", () => {
    const onConfirmEnd = vi.fn();
    const onKeepActive = vi.fn();
    const onCancel = vi.fn();

    render(
      <EndSessionConfirmModal
        open
        title="Encerrar reunião?"
        message="Teste"
        onConfirmEnd={onConfirmEnd}
        onKeepActive={onKeepActive}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByTestId("end-session-confirm"));
    fireEvent.click(screen.getByTestId("end-session-keep-active"));
    fireEvent.click(screen.getByTestId("end-session-cancel"));

    expect(onConfirmEnd).toHaveBeenCalledTimes(1);
    expect(onKeepActive).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <EndSessionConfirmModal
        open={false}
        title="Encerrar"
        message="Teste"
        onConfirmEnd={() => {}}
        onKeepActive={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByTestId("end-session-modal")).not.toBeInTheDocument();
  });
});
