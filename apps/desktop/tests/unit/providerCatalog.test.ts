import { describe, expect, it } from "vitest";
import {
  findCatalogMatches,
  PROVIDER_CATALOG,
  suggestNewConnectionName,
} from "../../src/lib/providerCatalog";
import type { ProviderConfigDto } from "../../src/lib/types";

const openRouterEntry = PROVIDER_CATALOG.find((e) => e.id === "openrouter")!;

const sampleProviders: ProviderConfigDto[] = [
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
    display_name: "OpenRouter (2)",
    base_url: "https://openrouter.ai/api/v1",
    model: "openai/whisper-1",
    enabled: true,
    local_only: false,
    has_credential: true,
  },
];

describe("providerCatalog", () => {
  it("finds all connections for a preset", () => {
    expect(findCatalogMatches(openRouterEntry, sampleProviders)).toHaveLength(2);
  });

  it("suggests numbered display name for additional connections", () => {
    expect(suggestNewConnectionName(openRouterEntry, [])).toBe("OpenRouter");
    expect(suggestNewConnectionName(openRouterEntry, sampleProviders)).toBe(
      "OpenRouter (3)",
    );
  });
});
