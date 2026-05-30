import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderSettingsView } from "../../src/features/providers/ProviderSettingsView";
import { PrivacySettingsView } from "../../src/features/settings/PrivacySettingsView";
import * as api from "../../src/lib/tauriClient";

vi.mock("../../src/lib/tauriClient", () => ({
  unwrap: (r: { ok: boolean; data?: unknown }) => {
    if (!r.ok) throw new Error("fail");
    return r.data;
  },
  listProviderConfigs: vi.fn(),
  createProviderConfig: vi.fn(),
  updateProviderConfig: vi.fn(),
  testProviderConfig: vi.fn(),
  enableProviderConfig: vi.fn(),
  disableProviderConfig: vi.fn(),
  deleteProviderConfig: vi.fn(),
  listModelTasks: vi.fn(),
  getModelRouting: vi.fn(),
  updateModelRouting: vi.fn(),
  testModelTask: vi.fn(),
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  acknowledgeHostedProviderWarning: vi.fn(),
}));

describe("Provider settings UI", () => {
  beforeEach(() => {
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "ollama-1",
          provider_kind: "ollama",
          display_name: "Ollama local",
          base_url: "http://127.0.0.1:11434",
          model: "llama3",
          enabled: true,
          local_only: true,
          has_credential: false,
          server_reachable: false,
        },
        {
          id: "openai-1",
          provider_kind: "openai",
          display_name: "OpenAI",
          base_url: null,
          model: "gpt-4o-mini",
          enabled: false,
          local_only: false,
          has_credential: true,
        },
      ],
    });
  });

  it("shows catalog presets", async () => {
    render(<ProviderSettingsView />);
    await waitFor(() => {
      expect(screen.getByTestId("provider-preset-ollama")).toBeInTheDocument();
      expect(screen.getByTestId("provider-preset-openrouter")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("task-model-routing-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("provider-preset-ollama")).toHaveTextContent(
      /Ollama não detectado/i,
    );
  });

  it("shows connected when Ollama server is reachable", async () => {
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "ollama-1",
          provider_kind: "ollama",
          display_name: "Ollama local",
          base_url: "http://127.0.0.1:11434",
          model: "llama3",
          enabled: true,
          local_only: true,
          has_credential: false,
          server_reachable: true,
        },
      ],
    });
    render(<ProviderSettingsView />);
    await waitFor(() => {
      expect(screen.getByTestId("provider-preset-ollama")).toHaveTextContent(
        /Conectado/i,
      );
    });
  });

  it("opens provider config modal from custom API card", async () => {
    render(<ProviderSettingsView />);
    await waitFor(() => screen.getByTestId("btn-create-provider"));
    fireEvent.click(screen.getByTestId("btn-create-provider"));
    await waitFor(() => {
      expect(screen.getByTestId("provider-config-modal")).toBeInTheDocument();
      expect(screen.getByTestId("provider-api-key")).toBeInTheDocument();
    });
  });

  it("shows missing key on connected hosted preset", async () => {
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "or-1",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
          enabled: true,
          local_only: false,
          has_credential: false,
        },
      ],
    });
    render(<ProviderSettingsView />);
    await waitFor(() => {
      expect(screen.getByText(/sem chave/i)).toBeInTheDocument();
    });
  });

  it("opens modal to add another connection when preset is connected", async () => {
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "or-1",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
          enabled: true,
          local_only: false,
          has_credential: true,
        },
      ],
    });
    render(<ProviderSettingsView />);
    await waitFor(() =>
      expect(screen.getByTestId("btn-add-provider-connection")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("btn-add-provider-connection"));
    await waitFor(() => {
      expect(screen.getByTestId("provider-config-modal")).toBeInTheDocument();
      expect(screen.getByTestId("provider-name-input")).toHaveValue("OpenRouter (2)");
    });
  });

  it("lists multiple connections on the same preset card", async () => {
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "or-1",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
          enabled: true,
          local_only: false,
          has_credential: true,
        },
        {
          id: "or-2",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter Whisper",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/whisper-1",
          enabled: true,
          local_only: false,
          has_credential: true,
        },
      ],
    });
    render(<ProviderSettingsView />);
    await waitFor(() => {
      expect(screen.getByTestId("provider-connection-list")).toBeInTheDocument();
      expect(screen.getByText(/OpenRouter Whisper/)).toBeInTheDocument();
      expect(screen.getByText(/whisper-1/)).toBeInTheDocument();
    });
  });

  it("calls test provider on connected preset", async () => {
    vi.mocked(api.testProviderConfig).mockResolvedValue({
      ok: true,
      data: "Ollama OK — modelo llama3.2 respondeu: OK",
    });
    render(<ProviderSettingsView />);
    await waitFor(() => screen.getByTestId("btn-test-connection-ollama-1"));
    fireEvent.click(screen.getByTestId("btn-test-connection-ollama-1"));
    await waitFor(() => {
      expect(api.testProviderConfig).toHaveBeenCalledWith("ollama-1");
      expect(screen.getByTestId("provider-test-toast-ollama-1")).toHaveTextContent(
        "respondeu: OK",
      );
    });
  });

  it("tests each connection separately when preset has multiple models", async () => {
    vi.mocked(api.testProviderConfig).mockResolvedValue({
      ok: true,
      data: "OK",
    });
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "or-1",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
          enabled: true,
          local_only: false,
          has_credential: true,
        },
        {
          id: "or-2",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter Whisper",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/whisper-1",
          enabled: true,
          local_only: false,
          has_credential: true,
        },
      ],
    });
    render(<ProviderSettingsView />);
    await waitFor(() => screen.getByTestId("btn-test-connection-or-2"));
    fireEvent.click(screen.getByTestId("btn-test-connection-or-2"));
    await waitFor(() => {
      expect(api.testProviderConfig).toHaveBeenCalledWith("or-2");
    });
  });

  it("reuses API key when adding another model on same preset", async () => {
    vi.mocked(api.listProviderConfigs).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "or-1",
          provider_kind: "openai_compatible",
          display_name: "OpenRouter",
          base_url: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
          enabled: true,
          local_only: false,
          has_credential: true,
        },
      ],
    });
    vi.mocked(api.createProviderConfig).mockResolvedValue({
      ok: true,
      data: {
        id: "or-2",
        provider_kind: "openai_compatible",
        display_name: "OpenRouter (2)",
        base_url: "https://openrouter.ai/api/v1",
        model: "openai/whisper-1",
        enabled: true,
        local_only: false,
        has_credential: true,
      },
    });
    render(<ProviderSettingsView />);
    await waitFor(() => screen.getByTestId("btn-add-provider-connection"));
    fireEvent.click(screen.getByTestId("btn-add-provider-connection"));
    await waitFor(() => {
      expect(screen.getByTestId("provider-shared-key-hint")).toBeInTheDocument();
      expect(screen.queryByTestId("provider-api-key")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("btn-save-provider"));
    await waitFor(() => {
      expect(api.createProviderConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          api_key: null,
          model: expect.any(String),
        }),
      );
    });
  });
});

describe("Privacy settings UI", () => {
  it("shows hosted warning when switching to hosted mode", async () => {
    vi.mocked(api.getPrivacySettings).mockResolvedValue({
      ok: true,
      data: {
        privacy_mode: "local_only",
        hosted_warning_acknowledged: false,
        requires_hosted_warning: false,
      },
    });
    render(<PrivacySettingsView />);
    await waitFor(() => screen.getByTestId("privacy-hosted_default"));
    fireEvent.click(screen.getByTestId("privacy-hosted_default").querySelector("input")!);
    expect(screen.getByTestId("hosted-privacy-warning")).toBeInTheDocument();
  });
});
