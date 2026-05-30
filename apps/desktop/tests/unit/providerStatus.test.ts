import { describe, expect, it } from "vitest";
import {
  isProviderOperational,
  providerConnectionStatusLabel,
  providerPresetStatusLabel,
} from "../../src/lib/providerStatus";
import type { ProviderConfigDto } from "../../src/lib/types";

const ollama = (
  overrides: Partial<ProviderConfigDto> = {},
): ProviderConfigDto => ({
  id: "ollama-1",
  provider_kind: "ollama",
  display_name: "Ollama",
  base_url: "http://127.0.0.1:11434",
  model: "llama3.2",
  enabled: true,
  local_only: true,
  has_credential: false,
  server_reachable: false,
  ...overrides,
});

describe("providerStatus", () => {
  it("does not treat Ollama as operational when server is unreachable", () => {
    expect(isProviderOperational(ollama())).toBe(false);
    expect(providerConnectionStatusLabel(ollama())).toBe("Ollama não detectado");
    expect(providerPresetStatusLabel("ollama", [ollama()])).toBe(
      "Ollama não detectado",
    );
  });

  it("treats Ollama as operational when server responds", () => {
    const connected = ollama({ server_reachable: true });
    expect(isProviderOperational(connected)).toBe(true);
    expect(providerConnectionStatusLabel(connected)).toBe("Conectado");
  });
});
