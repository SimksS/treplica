import { describe, expect, it } from "vitest";
import {
  buildMeetingStartInput,
  formToUpdateInput,
  hasUpdateInput,
  preferencesToForm,
} from "../../src/features/assistants/assistantContextUtils";

describe("assistantContextUtils", () => {
  it("preserves non-empty system prompt in update input", () => {
    const input = formToUpdateInput({
      role: "",
      objective: "",
      audience: "",
      company_or_product_notes: "",
      system_prompt: "  Meu prompt customizado  ",
      assistant_preset_id: "sales",
      preferred_tone: "",
      forbidden_topics: "",
    });
    expect(input.system_prompt).toBe("Meu prompt customizado");
    expect(hasUpdateInput(input)).toBe(true);
  });

  it("loads preferences dto into form", () => {
    const form = preferencesToForm({
      session_id: "",
      system_prompt: "Persistido",
      assistant_preset_id: "note-taker",
    });
    expect(form.system_prompt).toBe("Persistido");
    expect(form.assistant_preset_id).toBe("note-taker");
  });

  it("builds meeting start input from preset with optional pre-meeting context", () => {
    const input = buildMeetingStartInput("sales", {
      preMeetingContext: "  Cliente enterprise  ",
      preMeetingContextSource: "brief.pdf",
    });
    expect(input.assistant_preset_id).toBe("sales");
    expect(input.role).toBe("Vendas");
    expect(input.pre_meeting_context).toBe("Cliente enterprise");
    expect(input.pre_meeting_context_source).toBe("brief.pdf");
  });
});
