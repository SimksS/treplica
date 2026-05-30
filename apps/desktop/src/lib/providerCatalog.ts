import type { ProviderConfigDto } from "./types";
import { isProviderOperational } from "./providerStatus";
import type { ProviderFormState } from "../features/providers/ProviderConfigModal";

export type ProviderCatalogSection = "local" | "hosted";

export interface ProviderCatalogEntry {
  id: string;
  section: ProviderCatalogSection;
  title: string;
  description: string;
  icon: string;
  modalKind: string;
  actionLabel: string;
  secondaryAction?: { label: string; url: string };
  formPreset?: Partial<ProviderFormState>;
  comingSoon?: boolean;
  match: (provider: ProviderConfigDto) => boolean;
}

function urlIncludes(base: string | null | undefined, part: string): boolean {
  return (base ?? "").toLowerCase().includes(part);
}

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: "local-models",
    section: "local",
    title: "Modelos locais",
    description:
      "Execute modelos nativamente no dispositivo, de forma privada e offline, sem chaves de API.",
    icon: "🤖",
    modalKind: "ollama",
    actionLabel: "Gerenciar modelos baixados",
    comingSoon: true,
    match: () => false,
  },
  {
    id: "ollama",
    section: "local",
    title: "Ollama",
    description:
      "Execute modelos poderosos localmente. Rápido, privado e funciona offline.",
    icon: "🦙",
    modalKind: "ollama",
    actionLabel: "Buscar servidor Ollama",
    secondaryAction: {
      label: "Baixar Ollama",
      url: "https://ollama.com/download",
    },
    formPreset: {
      provider_kind: "ollama",
      display_name: "Ollama",
      base_url: "http://127.0.0.1:11434",
      model: "llama3.2",
      local_only: true,
    },
    match: (p) => p.provider_kind === "ollama",
  },
  {
    id: "lmstudio",
    section: "local",
    title: "LM Studio",
    description:
      "Descubra e execute qualquer LLM compatível localmente com interface amigável.",
    icon: "〰️",
    modalKind: "openai_compatible",
    actionLabel: "Buscar LM Studio",
    secondaryAction: {
      label: "Baixar LM Studio",
      url: "https://lmstudio.ai/",
    },
    formPreset: {
      provider_kind: "openai_compatible",
      display_name: "LM Studio",
      base_url: "http://127.0.0.1:1234/v1",
      model: "local-model",
      local_only: true,
    },
    match: (p) =>
      p.local_only && urlIncludes(p.base_url, "1234"),
  },
  {
    id: "openai",
    section: "hosted",
    title: "OpenAI API",
    description:
      "Use sua chave de desenvolvedor para GPT-4o, GPT-4 Turbo e modelos de transcrição.",
    icon: "◯",
    modalKind: "openai",
    actionLabel: "Configurar chave de API",
    formPreset: {
      provider_kind: "openai",
      display_name: "OpenAI",
      base_url: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    },
    match: (p) => p.provider_kind === "openai",
  },
  {
    id: "gemini",
    section: "hosted",
    title: "Google Gemini",
    description:
      "Modelos multimodais rápidos, incluindo Gemini 2.0 Flash e Pro.",
    icon: "✦",
    modalKind: "openai_compatible",
    actionLabel: "Adicionar chave de API",
    formPreset: {
      provider_kind: "openai_compatible",
      display_name: "Google Gemini",
      base_url: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: "gemini-2.0-flash",
    },
    match: (p) =>
      urlIncludes(p.base_url, "generativelanguage.googleapis.com"),
  },
  {
    id: "openrouter",
    section: "hosted",
    title: "OpenRouter",
    description:
      "Interface unificada para centenas de modelos com uma única chave de API.",
    icon: "⬡",
    modalKind: "openai_compatible",
    actionLabel: "Configurar OpenRouter",
    formPreset: {
      provider_kind: "openai_compatible",
      display_name: "OpenRouter",
      base_url: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o-mini",
    },
    match: (p) => urlIncludes(p.base_url, "openrouter.ai"),
  },
  {
    id: "groq",
    section: "hosted",
    title: "Groq",
    description:
      "Inferência ultrarrápida com Llama e Whisper — ótimo custo-benefício.",
    icon: "⚡",
    modalKind: "groq",
    actionLabel: "Configurar Groq",
    formPreset: {
      provider_kind: "groq",
      display_name: "Groq",
      base_url: "https://api.groq.com/openai/v1",
      model: "llama-3.1-8b-instant",
    },
    match: (p) => p.provider_kind === "groq",
  },
  {
    id: "custom",
    section: "hosted",
    title: "API personalizada",
    description:
      "Conecte qualquer endpoint compatível com OpenAI (vLLM, LocalAI, etc.).",
    icon: "◇",
    modalKind: "openai_compatible",
    actionLabel: "Configurar endpoint",
    match: (p) =>
      p.provider_kind === "openai_compatible" &&
      !urlIncludes(p.base_url, "openrouter.ai") &&
      !urlIncludes(p.base_url, "generativelanguage.googleapis.com") &&
      !(p.local_only && urlIncludes(p.base_url, "1234")),
  },
];

export function findCatalogMatches(
  entry: ProviderCatalogEntry,
  providers: ProviderConfigDto[],
): ProviderConfigDto[] {
  return providers.filter(entry.match);
}

export function findCatalogMatch(
  entry: ProviderCatalogEntry,
  providers: ProviderConfigDto[],
): ProviderConfigDto | undefined {
  return findCatalogMatches(entry, providers)[0];
}

/** Primeira conexão ativa do preset; senão a primeira cadastrada. */
export function primaryCatalogConnection(
  connections: ProviderConfigDto[],
): ProviderConfigDto | undefined {
  if (connections.length === 0) return undefined;
  return (
    connections.find(isProviderOperational) ??
    connections.find((p) => p.enabled) ??
    connections[0]
  );
}

/** Conexão do mesmo preset que já tem API key salva (para reutilizar ao adicionar modelo). */
export function findCredentialDonorForPreset(
  entry: ProviderCatalogEntry,
  providers: ProviderConfigDto[],
): ProviderConfigDto | undefined {
  return findCatalogMatches(entry, providers).find(
    (p) => !p.local_only && p.has_credential,
  );
}

export function suggestNewConnectionName(
  entry: ProviderCatalogEntry,
  existing: ProviderConfigDto[],
): string {
  const base = entry.formPreset?.display_name ?? entry.title;
  if (existing.length === 0) return base;
  return `${base} (${existing.length + 1})`;
}

export function providersWithoutCatalog(
  providers: ProviderConfigDto[],
): ProviderConfigDto[] {
  return providers.filter(
    (p) => !PROVIDER_CATALOG.some((entry) => entry.match(p)),
  );
}
