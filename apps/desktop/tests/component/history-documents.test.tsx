import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentsPanel } from "../../src/features/documents/DocumentsPanel";
import { DeleteSessionDialog } from "../../src/features/history/DeleteSessionDialog";
import { SessionHistoryView } from "../../src/features/history/SessionHistoryView";
import {
  fixtureDocuments,
  fixtureHistoryItems,
  fixtureSessionDetail,
} from "../fixtures/history-fixtures";

vi.mock("../../src/lib/tauriClient", () => ({
  unwrap: (r: { ok: boolean; data?: unknown }) => {
    if (!r.ok) throw new Error("fail");
    return r.data;
  },
  listSessionHistory: vi.fn(async () => ({
    ok: true,
    data: fixtureHistoryItems,
  })),
  getSessionDetail: vi.fn(),
}));

describe("History and documents UI", () => {
  it("shows history list from fixtures", async () => {
    render(<SessionHistoryView onSelectSession={() => {}} />);
    expect((await screen.findAllByTestId("history-item")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reunião encerrada/)).toBeInTheDocument();
  });

  it("shows empty documents state", () => {
    render(
      <DocumentsPanel
        documents={[]}
        onGenerate={() => {}}
        onExport={() => {}}
        onCopy={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByTestId("documents-empty")).toBeInTheDocument();
    expect(screen.getByTestId("btn-generate-summary")).toBeInTheDocument();
  });

  it("renders document items and actions", () => {
    render(
      <DocumentsPanel
        documents={fixtureDocuments}
        onGenerate={() => {}}
        onExport={() => {}}
        onCopy={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getAllByTestId("document-item")).toHaveLength(1);
    expect(screen.getByTestId("btn-export-document")).toBeInTheDocument();
  });

  it("delete dialog confirms and cancels", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DeleteSessionDialog
        open
        sessionTitle={fixtureSessionDetail.session.title}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByTestId("delete-session-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("btn-confirm-delete"));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("btn-cancel-delete"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows delete error state", () => {
    render(
      <DeleteSessionDialog
        open
        sessionTitle="Test"
        error="Falha ao excluir"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("delete-error")).toHaveTextContent("Falha ao excluir");
  });
});
