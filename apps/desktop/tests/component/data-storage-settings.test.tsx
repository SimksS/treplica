import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataStorageSettingsView } from "../../src/features/settings/DataStorageSettingsView";
import * as api from "../../src/lib/tauriClient";

vi.mock("../../src/lib/tauriClient", async () => {
  const actual = await vi.importActual<typeof api>("../../src/lib/tauriClient");
  return {
    ...actual,
    getDocumentsStorageSettings: vi.fn(),
    setDocumentsExportDirectory: vi.fn(),
    pickDocumentsExportDirectory: vi.fn(),
    pickDocumentsImportDirectory: vi.fn(),
    openDocumentsExportDirectory: vi.fn(),
    importSessionDocuments: vi.fn(),
  };
});

describe("DataStorageSettingsView", () => {
  it("shows effective export directory", async () => {
    vi.mocked(api.getDocumentsStorageSettings).mockResolvedValue({
      ok: true,
      data: {
        custom_export_dir: "D:\\Treplica\\exports",
        default_export_dir: "C:\\AppData\\exports",
        effective_export_dir: "D:\\Treplica\\exports",
      },
    });

    render(<DataStorageSettingsView />);

    expect(
      await screen.findByTestId("data-storage-settings-view"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("effective-export-dir")).toHaveTextContent(
      "D:\\Treplica\\exports",
    );
  });
});
