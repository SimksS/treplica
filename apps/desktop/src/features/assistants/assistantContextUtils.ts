import type { UpdateSessionContextInput } from "../../lib/tauriClient";
import type { SessionContextDto } from "../../lib/types";
import type { SessionContextForm } from "../live-session/SessionContextEditor";
import { ASSISTANT_PRESETS } from "./assistantPresets";

function opt(value: string | undefined | null): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export function formToUpdateInput(form: SessionContextForm): UpdateSessionContextInput {
  return {
    role: opt(form.role),
    objective: opt(form.objective),
    audience: opt(form.audience),
    company_or_product_notes: opt(form.company_or_product_notes),
    system_prompt: opt(form.system_prompt),
    assistant_preset_id: opt(form.assistant_preset_id),
    preferred_tone: opt(form.preferred_tone),
    forbidden_topics: opt(form.forbidden_topics),
  };
}

export interface MeetingStartOptions {
  preMeetingContext?: string;
  preMeetingContextSource?: string;
  /** JPEG/PNG data URLs — sent to the vision model when requesting guidance. */
  preMeetingAttachmentPages?: string[];
}

/** Builds session context for a new meeting from an assistant preset. */
export function buildMeetingStartInput(
  presetId: string,
  options?: MeetingStartOptions,
): UpdateSessionContextInput {
  const preset =
    ASSISTANT_PRESETS.find((p) => p.id === presetId) ?? ASSISTANT_PRESETS[0]!;
  return {
    role: opt(preset.form.role),
    objective: opt(preset.form.objective),
    audience: opt(preset.form.audience),
    company_or_product_notes: opt(preset.form.company_or_product_notes),
    system_prompt: opt(preset.systemPrompt),
    assistant_preset_id: preset.id,
    preferred_tone: opt(preset.form.preferred_tone),
    forbidden_topics: opt(preset.form.forbidden_topics),
    pre_meeting_context: opt(options?.preMeetingContext ?? null),
    pre_meeting_context_source: opt(options?.preMeetingContextSource ?? null),
    pre_meeting_attachment_pages_base64:
      options?.preMeetingAttachmentPages &&
      options.preMeetingAttachmentPages.length > 0
        ? options.preMeetingAttachmentPages
        : undefined,
  };
}

export function preferencesToForm(dto: SessionContextDto): SessionContextForm {
  return {
    role: dto.role ?? "",
    objective: dto.objective ?? "",
    audience: dto.audience ?? "",
    company_or_product_notes: dto.company_or_product_notes ?? "",
    system_prompt: dto.system_prompt ?? "",
    assistant_preset_id: dto.assistant_preset_id ?? "",
    preferred_tone: dto.preferred_tone ?? "",
    forbidden_topics: dto.forbidden_topics ?? "",
  };
}

export function hasAssistantConfig(form: SessionContextForm): boolean {
  return Boolean(
    form.system_prompt.trim() ||
      form.role.trim() ||
      form.objective.trim() ||
      form.assistant_preset_id.trim(),
  );
}

export function hasUpdateInput(input: UpdateSessionContextInput): boolean {
  return Object.entries(input).some(([key, value]) => {
    if (key === "pre_meeting_attachment_pages_base64" && Array.isArray(value)) {
      return value.length > 0;
    }
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function formToSessionContextDto(
  form: SessionContextForm,
  sessionId = "",
): SessionContextDto {
  return {
    session_id: sessionId,
    role: opt(form.role),
    objective: opt(form.objective),
    audience: opt(form.audience),
    company_or_product_notes: opt(form.company_or_product_notes),
    system_prompt: opt(form.system_prompt),
    assistant_preset_id: opt(form.assistant_preset_id),
    preferred_tone: opt(form.preferred_tone),
    forbidden_topics: opt(form.forbidden_topics),
  };
}
