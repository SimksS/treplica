import type { ProviderConfigDto } from "./types";

export function isOllamaProvider(provider: ProviderConfigDto): boolean {
  return provider.provider_kind === "ollama";
}

/** Provider is configured and ready to use (API key or local daemon reachable). */
export function isProviderOperational(provider: ProviderConfigDto): boolean {
  if (!provider.enabled) return false;
  if (isOllamaProvider(provider)) {
    return provider.server_reachable === true;
  }
  if (provider.local_only) {
    if (provider.server_reachable != null) {
      return provider.server_reachable;
    }
    return true;
  }
  return provider.has_credential;
}

export function providerConnectionStatusLabel(
  provider: ProviderConfigDto,
): string {
  if (!provider.enabled) return "Desativado";
  if (isOllamaProvider(provider)) {
    if (provider.server_reachable === true) return "Conectado";
    if (provider.server_reachable === false) return "Ollama não detectado";
    return "Verificando…";
  }
  if (provider.local_only) {
    if (provider.server_reachable === false) return "Servidor offline";
    return "Conectado";
  }
  if (provider.has_credential) return "Conectado";
  return "Sem chave";
}

export function providerPresetStatusLabel(
  entryId: string,
  connections: ProviderConfigDto[],
): string {
  if (connections.length === 0) return "Não conectado";
  const operational = connections.filter(isProviderOperational);
  if (operational.length > 0) {
    return operational.length > 1
      ? `${operational.length} conexões`
      : providerConnectionStatusLabel(operational[0]!);
  }
  if (entryId === "ollama") {
    const ollama = connections.find(isOllamaProvider);
    if (ollama?.server_reachable === false) {
      return "Ollama não detectado";
    }
  }
  return "Configurado";
}
