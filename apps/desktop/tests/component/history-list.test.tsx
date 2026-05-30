import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SessionHistoryView } from "../../src/features/history/SessionHistoryView";
import { fixtureHistoryItems } from "../fixtures/history-fixtures";

const listSessionHistory = vi.fn();
const renameSession = vi.fn();

vi.mock("../../src/lib/tauriClient", () => ({
  unwrap: (r: { ok: boolean; data?: unknown; error?: { message?: string } }) => {
    if (!r.ok) throw new Error(r.error?.message ?? "fail");
    return r.data;
  },
  listSessionHistory: (...args: unknown[]) => listSessionHistory(...args),
  renameSession: (...args: unknown[]) => renameSession(...args),
}));

describe("SessionHistoryView", () => {
  beforeEach(() => {
    listSessionHistory.mockReset();
    renameSession.mockReset();
    listSessionHistory.mockResolvedValue({
      ok: true,
      data: fixtureHistoryItems,
    });
  });

  it("loads and shows session cards", async () => {
    render(<SessionHistoryView onSelectSession={() => {}} />);
    expect(await screen.findAllByTestId("history-item")).toHaveLength(2);
    expect(screen.getByText("Reunião encerrada")).toBeInTheDocument();
    expect(screen.getByText("Ao vivo")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    render(<SessionHistoryView onSelectSession={() => {}} />);
    await screen.findAllByTestId("history-item");
    fireEvent.click(screen.getByTestId("history-filter-ended"));
    await waitFor(() => {
      expect(listSessionHistory).toHaveBeenCalledWith(undefined, "ended", "all");
    });
  });

  it("filters by assistant preset", async () => {
    render(<SessionHistoryView onSelectSession={() => {}} />);
    await screen.findAllByTestId("history-item");
    fireEvent.click(screen.getByTestId("history-assistant-filter-sales"));
    await waitFor(() => {
      expect(listSessionHistory).toHaveBeenCalledWith(undefined, "all", "sales");
    });
    expect(screen.getByTestId("history-assistant-filter-sales")).toHaveClass("active");
  });

  it("searches by query with debounce", async () => {
    render(<SessionHistoryView onSelectSession={() => {}} />);
    await screen.findAllByTestId("history-item");
    listSessionHistory.mockClear();
    fireEvent.change(screen.getByTestId("history-search"), {
      target: { value: "contrato" },
    });
    await waitFor(
      () => {
        expect(listSessionHistory).toHaveBeenCalledWith("contrato", "all", "all");
      },
      { timeout: 2000 },
    );
  });

  it("renames a session from the card", async () => {
    renameSession.mockResolvedValue({
      ok: true,
      data: { ...fixtureHistoryItems[0], title: "Demo com cliente" },
    });
    render(<SessionHistoryView onSelectSession={() => {}} />);
    await screen.findAllByTestId("history-item");
    fireEvent.click(screen.getAllByTestId("history-rename-btn")[0]);
    fireEvent.change(screen.getByTestId("history-rename-input"), {
      target: { value: "Demo com cliente" },
    });
    fireEvent.click(screen.getByTestId("history-rename-save"));
    await waitFor(() => {
      expect(renameSession).toHaveBeenCalledWith("session-1", "Demo com cliente");
    });
    expect(screen.getByText("Demo com cliente")).toBeInTheDocument();
  });
});
