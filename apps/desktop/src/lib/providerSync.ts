import type { ProviderConfigDto } from "./types";
import { isOllamaProvider, isProviderOperational } from "./providerStatus";
import type { ModelRoutingDto } from "./tauriClient";
import { TASK_MODEL_FIELDS } from "./taskModelSuggestions";

export const PROVIDERS_CHANGED_EVENT = "treplica-providers-changed";

export function notifyProvidersChanged(): void {
  window.dispatchEvent(new CustomEvent(PROVIDERS_CHANGED_EVENT));
}

export function formatProviderOptionLabel(p: ProviderConfigDto): string {
  const tags: string[] = [];
  if (!p.enabled) tags.push("desativado");
  else if (isOllamaProvider(p) && p.server_reachable === false) {
    tags.push("ollama offline");
  } else if (!isProviderOperational(p)) {
    if (!p.local_only && !p.has_credential) tags.push("sem chave");
    else if (p.local_only) tags.push("offline");
  }
  const model = p.model ? ` · ${p.model}` : "";
  const suffix = tags.length > 0 ? ` (${tags.join(", ")})` : "";
  return `${p.display_name}${model}${suffix}`;
}

/** Remove routing slots that point to providers that no longer exist. */
export function sanitizeModelRouting(
  routing: ModelRoutingDto,
  providers: ProviderConfigDto[],
): { routing: ModelRoutingDto; changed: boolean } {
  const ids = new Set(providers.map((p) => p.id));
  let changed = false;
  const next = { ...routing };

  for (const fields of Object.values(TASK_MODEL_FIELDS)) {
    const providerKey = fields.provider as keyof ModelRoutingDto;
    const modelKey = fields.model as keyof ModelRoutingDto;
    const pid = next[providerKey] as string | null | undefined;
    if (pid && !ids.has(pid)) {
      next[providerKey] = null as never;
      next[modelKey] = null as never;
      changed = true;
    }
  }

  return { routing: next, changed };
}

export function sortProvidersForSelect(
  providers: ProviderConfigDto[],
): ProviderConfigDto[] {
  return [...providers].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "pt-BR"),
  );
}
