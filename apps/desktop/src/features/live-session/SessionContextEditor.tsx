import { useEffect, useState } from "react";
import type { SessionContextDto } from "../../lib/types";

export interface SessionContextForm {
  role: string;
  objective: string;
  audience: string;
  company_or_product_notes: string;
  system_prompt: string;
  assistant_preset_id: string;
  preferred_tone: string;
  forbidden_topics: string;
}

interface Props {
  context: SessionContextDto | null;
  disabled?: boolean;
  onSave: (form: SessionContextForm) => void;
}

const emptyForm: SessionContextForm = {
  role: "",
  objective: "",
  audience: "",
  company_or_product_notes: "",
  system_prompt: "",
  assistant_preset_id: "",
  preferred_tone: "",
  forbidden_topics: "",
};

export function formFromContext(ctx: SessionContextDto | null): SessionContextForm {
  if (!ctx) return emptyForm;
  return {
    role: ctx.role ?? "",
    objective: ctx.objective ?? "",
    audience: ctx.audience ?? "",
    company_or_product_notes: ctx.company_or_product_notes ?? "",
    system_prompt: ctx.system_prompt ?? "",
    assistant_preset_id: ctx.assistant_preset_id ?? "",
    preferred_tone: ctx.preferred_tone ?? "",
    forbidden_topics: ctx.forbidden_topics ?? "",
  };
}

export function SessionContextEditor({ context, disabled, onSave }: Props) {
  const [form, setForm] = useState<SessionContextForm>(emptyForm);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(formFromContext(context));
    setDirty(false);
  }, [context]);

  const update = (field: keyof SessionContextForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  return (
    <section className="panel context-editor" data-testid="session-context-editor">
      <h2 className="panel-title">Contexto da sessão</h2>
      <p className="context-hint">
        Papel e objetivo orientam objeções, follow-ups e próximos passos.
      </p>
      <div className="context-grid">
        <label>
          Papel
          <input
            value={form.role}
            disabled={disabled}
            placeholder="ex.: Vendas, Entrevista"
            onChange={(e) => update("role", e.target.value)}
            data-testid="ctx-role"
          />
        </label>
        <label>
          Objetivo
          <input
            value={form.objective}
            disabled={disabled}
            placeholder="ex.: Fechar contrato Q2"
            onChange={(e) => update("objective", e.target.value)}
            data-testid="ctx-objective"
          />
        </label>
        <label>
          Audiência
          <input
            value={form.audience}
            disabled={disabled}
            onChange={(e) => update("audience", e.target.value)}
            data-testid="ctx-audience"
          />
        </label>
        <label>
          Tom preferido
          <input
            value={form.preferred_tone}
            disabled={disabled}
            onChange={(e) => update("preferred_tone", e.target.value)}
            data-testid="ctx-tone"
          />
        </label>
        <label className="context-wide">
          Notas do produto / empresa
          <textarea
            value={form.company_or_product_notes}
            disabled={disabled}
            rows={2}
            onChange={(e) => update("company_or_product_notes", e.target.value)}
            data-testid="ctx-notes"
          />
        </label>
        <label className="context-wide">
          Tópicos proibidos
          <input
            value={form.forbidden_topics}
            disabled={disabled}
            onChange={(e) => update("forbidden_topics", e.target.value)}
            data-testid="ctx-forbidden"
          />
        </label>
      </div>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled || !dirty}
        onClick={() => {
          onSave(form);
          setDirty(false);
        }}
        data-testid="btn-save-context"
      >
        Salvar contexto
      </button>
      <style>{`
        .context-hint { margin: 0 0 var(--space-sm); font-size: 0.8125rem; color: var(--color-text-muted); }
        .context-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); margin-bottom: var(--space-sm); }
        .context-wide { grid-column: 1 / -1; }
        .context-grid label { display: flex; flex-direction: column; gap: var(--space-xs); font-size: 0.8125rem; color: var(--color-text-muted); }
        .context-grid input, .context-grid textarea {
          background: var(--color-surface-elevated);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-xs) var(--space-sm);
          font-size: 0.875rem;
        }
        @media (max-width: 700px) { .context-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
