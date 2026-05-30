import { describe, expect, it } from "vitest";
import {
  formatProviderOptionLabel,
  sanitizeModelRouting,
} from "../../src/lib/providerSync";
import type { ProviderConfigDto } from "../../src/lib/types";

const sampleProvider = (overrides: Partial<ProviderConfigDto>): ProviderConfigDto => ({
  id: "p1",
  provider_kind: "openai_compatible",
  display_name: "OpenRouter",
  base_url: "https://openrouter.ai/api/v1",
  model: "openai/gpt-4o-mini",
  enabled: true,
  local_only: false,
  has_credential: true,
  ...overrides,
});

describe("providerSync", () => {
  it("formats provider labels with status hints", () => {
    expect(formatProviderOptionLabel(sampleProvider({}))).toContain("OpenRouter");
    expect(
      formatProviderOptionLabel(sampleProvider({ enabled: false })),
    ).toContain("desativado");
    expect(
      formatProviderOptionLabel(sampleProvider({ has_credential: false })),
    ).toContain("sem chave");
  });

  it("clears routing for deleted providers", () => {
    const { routing, changed } = sanitizeModelRouting(
      { guidance_provider_id: "gone", guidance_model: "x" },
      [sampleProvider({ id: "other" })],
    );
    expect(changed).toBe(true);
    expect(routing.guidance_provider_id).toBeNull();
    expect(routing.guidance_model).toBeNull();
  });
});
