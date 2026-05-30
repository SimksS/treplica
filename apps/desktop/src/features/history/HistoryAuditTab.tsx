import type { SessionDetailDto } from "../../lib/types";
import { formatHistoryTime } from "./sessionDetailUtils";

interface Props {
  auditEvents: SessionDetailDto["audit_events"];
  providerCalls: SessionDetailDto["provider_calls"];
}

export function HistoryAuditTab({ auditEvents, providerCalls }: Props) {
  return (
    <div className="history-audit" data-testid="history-audit-tab">
      {providerCalls.length > 0 && (
        <section className="history-audit-section">
          <h4 className="history-audit-title">Chamadas de provedor</h4>
          <ul className="history-audit-list">
            {providerCalls.map((c) => (
              <li key={c.id} data-testid="history-provider-call">
                <span className="history-audit-action">{c.purpose}</span>
                <span className="history-audit-meta">
                  {c.status} · {c.local_or_hosted}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {auditEvents.length === 0 ? (
        <p className="history-empty">Nenhum evento de auditoria.</p>
      ) : (
        <section className="history-audit-section">
          <h4 className="history-audit-title">Eventos</h4>
          <ul className="history-audit-list">
            {auditEvents.map((a) => (
              <li key={a.id} data-testid="history-audit-item">
                <span className="history-audit-action">{a.action}</span>
                <span className="history-audit-meta">
                  {a.category} · {a.severity}
                  {a.created_at
                    ? ` · ${formatHistoryTime(a.created_at)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
