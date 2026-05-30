import { useEffect, useState } from "react";
import { IconClose } from "../../components/layout/Icons";
import type { SessionContextDto } from "../../lib/types";
import {
  type SessionContextForm,
  formFromContext,
} from "../live-session/SessionContextEditor";
import { ASSISTANT_PRESETS, type AssistantPreset } from "./assistantPresets";

interface Props {
  open: boolean;
  onClose: () => void;
  context: SessionContextDto | null;
  disabled?: boolean;
  onSave: (form: SessionContextForm) => void;
}

type Tab = "system" | "context" | "followup";

export function AssistantConfigModal({
  open,
  onClose,
  context,
  disabled,
  onSave,
}: Props) {
  const [presetId, setPresetId] = useState("note-taker");
  const [tab, setTab] = useState<Tab>("system");
  const [form, setForm] = useState<SessionContextForm>(
    ASSISTANT_PRESETS[0]!.form,
  );
  const [systemPrompt, setSystemPrompt] = useState(
    ASSISTANT_PRESETS[0]!.systemPrompt,
  );
  const [onlyWhenCertain, setOnlyWhenCertain] = useState(true);

  useEffect(() => {
    if (!open) return;
    const base = formFromContext(context);
    const savedPreset = context?.assistant_preset_id;
    const savedPrompt = context?.system_prompt?.trim();

    if (savedPreset) {
      const preset =
        ASSISTANT_PRESETS.find((p) => p.id === savedPreset) ?? ASSISTANT_PRESETS[0]!;
      setPresetId(preset.id);
      setForm({
        ...base,
        role: base.role || preset.form.role,
        objective: base.objective || preset.form.objective,
        audience: base.audience || preset.form.audience,
      });
      setSystemPrompt(savedPrompt || preset.systemPrompt);
      return;
    }

    const hasContext = Boolean(
      context?.role || context?.objective || savedPrompt,
    );
    if (hasContext) {
      setForm(base);
      setPresetId("general");
      setSystemPrompt(savedPrompt || ASSISTANT_PRESETS.find((p) => p.id === "general")!.systemPrompt);
    } else {
      const preset = ASSISTANT_PRESETS.find((p) => p.id === presetId) ?? ASSISTANT_PRESETS[0]!;
      setForm(preset.form);
      setSystemPrompt(preset.systemPrompt);
    }
  }, [open, context]);

  const applyPreset = (preset: AssistantPreset) => {
    setPresetId(preset.id);
    setForm(preset.form);
    setSystemPrompt(preset.systemPrompt);
  };

  if (!open) return null;

  const activePreset = ASSISTANT_PRESETS.find((p) => p.id === presetId);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal data-testid="assistant-config-modal">
      <div className="assistant-modal">
        <aside className="assistant-sidebar">
          {ASSISTANT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`assistant-preset ${presetId === p.id ? "active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              <strong>{p.name}</strong>
              <span>{p.subtitle}</span>
            </button>
          ))}
        </aside>
        <div className="assistant-main">
          <div className="assistant-modal-header">
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
              {activePreset?.name ?? "Assistente"}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
              <IconClose />
            </button>
          </div>
          <div className="tab-bar">
            <button
              type="button"
              className={`tab-btn ${tab === "system" ? "active" : ""}`}
              onClick={() => setTab("system")}
            >
              Sistema
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === "context" ? "active" : ""}`}
              onClick={() => setTab("context")}
            >
              Contexto
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === "followup" ? "active" : ""}`}
              onClick={() => setTab("followup")}
            >
              Acompanhamento
            </button>
          </div>
          {tab === "system" && (
            <textarea
              className="prompt-editor"
              value={systemPrompt}
              disabled={disabled}
              onChange={(e) => setSystemPrompt(e.target.value)}
              data-testid="assistant-system-prompt"
            />
          )}
          {tab === "context" && (
            <div style={{ padding: "16px 24px", display: "grid", gap: 12 }}>
              <label>
                Papel
                <input
                  value={form.role}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  data-testid="ctx-role"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </label>
              <label>
                Objetivo
                <input
                  value={form.objective}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
                  data-testid="ctx-objective"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </label>
              <label>
                Audiência
                <input
                  value={form.audience}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                  data-testid="ctx-audience"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </label>
            </div>
          )}
          {tab === "followup" && (
            <p style={{ padding: "24px", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Sugestões de follow-up e objeções usam o contexto salvo e a transcrição ao vivo.
            </p>
          )}
          <div style={{ padding: "0 24px 12px" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.875rem" }}>
              <input
                type="checkbox"
                checked={onlyWhenCertain}
                onChange={(e) => setOnlyWhenCertain(e.target.checked)}
              />
              Responder apenas quando tiver certeza
            </label>
            {onlyWhenCertain && (
              <p className="card-muted" style={{ marginTop: 8 }}>
                Quando ativado, orientações de baixa confiança aparecem marcadas na sessão ao vivo.
              </p>
            )}
          </div>
          <div className="assistant-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={disabled}
              onClick={() => {
                onSave({
                  ...form,
                  system_prompt: systemPrompt,
                  assistant_preset_id: presetId,
                });
                onClose();
              }}
              data-testid="btn-save-context"
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
