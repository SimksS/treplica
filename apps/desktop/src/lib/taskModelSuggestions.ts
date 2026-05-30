/** Suggested model ids per provider kind and task (user can type any id). */
const SUGGESTIONS: Record<string, Record<string, string[]>> = {
  transcription: {
    ollama: [],
    openai: ["whisper-1"],
    groq: ["whisper-large-v3"],
    nvidia: ["openai/whisper-large-v3"],
    openai_compatible: [
      "openai/whisper-1",
      "whisper-large-v3",
      "whisper-1",
    ],
  },
  guidance: {
    ollama: ["llama3.2", "qwen2.5:7b"],
    openai: ["gpt-4o-mini", "gpt-4o"],
    groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
    nvidia: ["meta/llama-3.1-70b-instruct"],
    anthropic: ["claude-3-5-haiku-latest"],
    openai_compatible: [
      "openai/gpt-4o-mini",
      "google/gemini-2.0-flash",
      "anthropic/claude-3.5-haiku",
    ],
  },
  translation: {
    ollama: ["qwen2.5:3b", "llama3.2"],
    openai: ["gpt-4o-mini"],
    groq: ["llama-3.1-8b-instant"],
    openai_compatible: [
      "google/gemini-2.0-flash-lite",
      "openai/gpt-4o-mini",
    ],
  },
  summarization: {
    ollama: ["qwen2.5:14b", "llama3.2"],
    openai: ["gpt-4o-mini"],
    groq: ["llama-3.3-70b-versatile"],
    openai_compatible: [
      "google/gemini-2.0-flash",
      "openai/gpt-4o-mini",
    ],
  },
  vision: {
    ollama: ["llava:7b"],
    openai: ["gpt-4o-mini"],
    openai_compatible: [
      "google/gemini-2.0-flash",
      "openai/gpt-4o-mini",
    ],
  },
  search: {
    openai: ["gpt-4o-mini"],
    openai_compatible: ["google/gemini-2.0-flash-lite", "perplexity/sonar"],
  },
};

export function modelSuggestionsForTask(
  taskId: string,
  providerKind?: string | null,
  providerModel?: string | null,
): string[] {
  const byKind = SUGGESTIONS[taskId] ?? SUGGESTIONS.guidance;
  const list = providerKind ? (byKind[providerKind] ?? []) : [];
  const defaults = byKind.openai_compatible ?? [];
  const merged = [...new Set([...list, ...defaults])];
  if (providerModel?.trim()) {
    return [providerModel.trim(), ...merged.filter((m) => m !== providerModel)];
  }
  return merged;
}

export const TASK_MODEL_FIELDS: Record<
  string,
  { provider: string; model: string }
> = {
  transcription: {
    provider: "transcription_provider_id",
    model: "transcription_model",
  },
  guidance: { provider: "guidance_provider_id", model: "guidance_model" },
  translation: {
    provider: "translation_provider_id",
    model: "translation_model",
  },
  vision: { provider: "vision_provider_id", model: "vision_model" },
  search: { provider: "search_provider_id", model: "search_model" },
  summarization: {
    provider: "summarization_provider_id",
    model: "summarization_model",
  },
};
