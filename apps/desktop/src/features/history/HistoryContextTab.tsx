import type { SessionContextDto } from "../../lib/types";
import { ASSISTANT_PRESETS } from "../assistants/assistantPresets";

interface Props {
  context: SessionContextDto | null | undefined;
}

export function HistoryContextTab({ context }: Props) {
  if (!context) {
    return (
      <p className="card-muted" data-testid="history-context-empty">
        Nenhum contexto registrado para esta sessão.
      </p>
    );
  }

  const preset = context.assistant_preset_id
    ? ASSISTANT_PRESETS.find((p) => p.id === context.assistant_preset_id)
    : undefined;

  const hasVisualAttachment =
    (context.pre_meeting_attachment_page_count ?? 0) > 0;
  const hasPreMeeting =
    Boolean(context.pre_meeting_context?.trim()) || hasVisualAttachment;
  const hasConfig = Boolean(
    preset ||
      context.role ||
      context.objective ||
      context.system_prompt,
  );

  if (!hasPreMeeting && !hasConfig) {
    return (
      <p className="card-muted" data-testid="history-context-empty">
        Nenhum contexto registrado para esta sessão.
      </p>
    );
  }

  return (
    <div className="history-context-panel" data-testid="history-context-panel">
      {preset && (
        <section className="history-context-block">
          <h3 className="card-label">Assistente</h3>
          <p className="card-title" style={{ margin: "4px 0" }}>
            {preset.name}
          </p>
          <p className="card-muted">{preset.subtitle}</p>
        </section>
      )}

      {(context.role || context.objective || context.audience) && (
        <section className="history-context-block">
          <h3 className="card-label">Configuração da sessão</h3>
          <dl className="history-context-dl">
            {context.role && (
              <>
                <dt>Papel</dt>
                <dd>{context.role}</dd>
              </>
            )}
            {context.objective && (
              <>
                <dt>Objetivo</dt>
                <dd>{context.objective}</dd>
              </>
            )}
            {context.audience && (
              <>
                <dt>Audiência</dt>
                <dd>{context.audience}</dd>
              </>
            )}
            {context.preferred_tone && (
              <>
                <dt>Tom</dt>
                <dd>{context.preferred_tone}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {hasPreMeeting && (
        <section className="history-context-block">
          <h3 className="card-label">Contexto pré-reunião</h3>
          {context.pre_meeting_context_source && (
            <p className="card-muted" data-testid="history-context-source">
              Fonte: {context.pre_meeting_context_source}
            </p>
          )}
          {hasVisualAttachment && (
            <p className="card-muted" data-testid="history-context-visual">
              Anexo visual: {context.pre_meeting_attachment_page_count} página(s)
              enviadas ao modelo de visão nas orientações.
            </p>
          )}
          {context.pre_meeting_context?.trim() && (
            <pre
              className="history-context-pre"
              data-testid="history-pre-meeting-text"
            >
              {context.pre_meeting_context}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
