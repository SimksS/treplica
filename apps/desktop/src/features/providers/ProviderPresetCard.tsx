import type { ProviderCatalogEntry } from "../../lib/providerCatalog";
import { primaryCatalogConnection } from "../../lib/providerCatalog";
import {
  isOllamaProvider,
  isProviderOperational,
  providerConnectionStatusLabel,
  providerPresetStatusLabel,
} from "../../lib/providerStatus";
import type { ProviderConfigDto } from "../../lib/types";

interface Props {
  entry: ProviderCatalogEntry;
  connections?: ProviderConfigDto[];
  onPrimaryAction: () => void;
  onAddConnection?: () => void;
  onManage?: (provider: ProviderConfigDto) => void;
  onTest?: (providerId: string) => void;
  testingProviderId?: string | null;
  testFeedback?: { providerId: string; message: string; kind: "success" | "error" } | null;
}

export function ProviderPresetCard({
  entry,
  connections = [],
  onPrimaryAction,
  onAddConnection,
  onManage,
  onTest,
  testingProviderId = null,
  testFeedback = null,
}: Props) {
  const connected = primaryCatalogConnection(connections);
  const isConnected = connected != null && isProviderOperational(connected);
  const hasAnyConnection = connections.length > 0;
  const ollamaOffline =
    entry.id === "ollama" &&
    connections.some((p) => isOllamaProvider(p) && p.server_reachable === false);

  const canTest = (p: ProviderConfigDto) => p.enabled;

  return (
    <li className="provider-catalog-card card" data-testid={`provider-preset-${entry.id}`}>
      <div className="provider-catalog-card-top">
        <span className="provider-catalog-icon" aria-hidden>
          {entry.icon}
        </span>
        <span
          className={`provider-catalog-status ${isConnected ? "connected" : ""}`}
          data-testid="provider-preset-status"
        >
          {entry.comingSoon
            ? "Em breve"
            : providerPresetStatusLabel(entry.id, connections)}
        </span>
      </div>
      <h3 className="provider-catalog-title">{entry.title}</h3>
      <p className="provider-catalog-desc">{entry.description}</p>
      {ollamaOffline && (
        <p className="provider-catalog-hint card-muted">
          Instale e inicie o Ollama em{" "}
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noreferrer"
            className="provider-catalog-link"
          >
            ollama.com
          </a>
          , depois use &quot;Testar&quot; para validar.
        </p>
      )}
      {connections.length === 1 && connected && (
        <p className="provider-catalog-meta card-muted">
          {connected.model ?? "modelo padrão"}
          {!isOllamaProvider(connected) &&
            !connected.local_only &&
            !connected.has_credential && (
            <span className="provider-credential-warning"> · sem chave</span>
          )}
        </p>
      )}
      {connections.length >= 1 && (
        <ul
          className="provider-connection-list"
          data-testid="provider-connection-list"
        >
          {connections.map((p) => (
            <li key={p.id} className="provider-connection-item">
              <span className="provider-connection-label">
                {p.display_name}
                <span className="card-muted"> · {p.model ?? "modelo padrão"}</span>
                <span className="card-muted">
                  {" "}
                  · {providerConnectionStatusLabel(p)}
                </span>
              </span>
              <div className="provider-connection-actions">
                <button
                  type="button"
                  className="btn-catalog btn-catalog--ghost btn-sm"
                  onClick={() => onManage?.(p)}
                  data-testid={`btn-manage-connection-${p.id}`}
                >
                  Editar
                </button>
                {onTest && canTest(p) && (
                  <button
                    type="button"
                    className="btn-catalog btn-catalog--ghost btn-sm"
                    onClick={() => onTest(p.id)}
                    disabled={testingProviderId === p.id}
                    data-testid={`btn-test-connection-${p.id}`}
                  >
                    {testingProviderId === p.id ? "Testando…" : "Testar"}
                  </button>
                )}
              </div>
              {testFeedback?.providerId === p.id && (
                <p
                  className={
                    testFeedback.kind === "error"
                      ? "provider-test-toast provider-test-toast--error"
                      : "provider-test-toast provider-test-toast--success"
                  }
                  role={testFeedback.kind === "error" ? "alert" : undefined}
                  data-testid={`provider-test-toast-${p.id}`}
                >
                  {testFeedback.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="provider-catalog-actions">
        {entry.comingSoon ? (
          <button type="button" className="btn-catalog" disabled>
            {entry.actionLabel}
          </button>
        ) : isConnected || hasAnyConnection ? (
          <>
            <button
              type="button"
              className="btn-catalog btn-catalog--ghost"
              onClick={onAddConnection ?? onPrimaryAction}
              data-testid="btn-add-provider-connection"
            >
              Adicionar outra conexão
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-catalog"
            onClick={onPrimaryAction}
            data-testid={
              entry.id === "custom" ? "btn-create-provider" : undefined
            }
          >
            {entry.actionLabel}
          </button>
        )}
        {entry.secondaryAction && (
          <a
            className="provider-catalog-link"
            href={entry.secondaryAction.url}
            target="_blank"
            rel="noreferrer"
          >
            {entry.secondaryAction.label} ↗
          </a>
        )}
      </div>

      <style>{`
        .provider-test-toast {
          flex-basis: 100%;
          margin: 0;
          font-size: 12px;
          text-align: center;
          padding: 8px 10px;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: var(--color-text, #e8ecf1);
        }
        .provider-test-toast--success {
          border-color: rgba(61, 214, 140, 0.35);
          background: rgba(61, 214, 140, 0.08);
        }
        .provider-test-toast--error {
          border-color: rgba(255, 107, 107, 0.35);
          background: rgba(255, 107, 107, 0.08);
        }
      `}</style>
    </li>
  );
}
