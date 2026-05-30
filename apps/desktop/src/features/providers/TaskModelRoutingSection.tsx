import { useCallback, useEffect, useState } from "react";

import * as api from "../../lib/tauriClient";

import { unwrap } from "../../lib/tauriClient";

import type { ModelRoutingDto, ModelTaskInfoDto } from "../../lib/tauriClient";

import type { ProviderConfigDto } from "../../lib/types";

import {
  formatProviderOptionLabel,
  PROVIDERS_CHANGED_EVENT,
  sanitizeModelRouting,
  sortProvidersForSelect,
} from "../../lib/providerSync";

import { isTranscriptionModelId } from "../../lib/sttModel";
import { TASK_MODEL_FIELDS } from "../../lib/taskModelSuggestions";

interface Props {
  /** When true, only the grid is shown (page supplies the title). */
  hideHeader?: boolean;
}

export function TaskModelRoutingSection({ hideHeader = false }: Props) {
  const [tasks, setTasks] = useState<ModelTaskInfoDto[]>([]);
  const [providers, setProviders] = useState<ProviderConfigDto[]>([]);
  const [routing, setRouting] = useState<ModelRoutingDto>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    const list = sortProvidersForSelect(unwrap(await api.listProviderConfigs()));
    setProviders(list);
    return list;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, provList, route] = await Promise.all([
        api.listModelTasks(),
        api.listProviderConfigs(),
        api.getModelRouting(),
      ]);
      setTasks(unwrap(taskList));
      const sorted = sortProvidersForSelect(unwrap(provList));
      setProviders(sorted);
      const routeRaw = unwrap(route);
      const { routing: sanitized, changed } = sanitizeModelRouting(routeRaw, sorted);
      setRouting(sanitized);
      if (changed) {
        const saved = unwrap(await api.updateModelRouting(sanitized));
        setRouting(saved);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onProvidersChanged = () => {
      void (async () => {
        const list = await loadProviders();
        setRouting((current) => {
          const { routing: sanitized, changed } = sanitizeModelRouting(current, list);
          if (changed) {
            void api.updateModelRouting(sanitized).then((res) => {
              if (res.ok && res.data) setRouting(res.data);
            });
          }
          return changed ? sanitized : current;
        });
      })();
    };
    window.addEventListener(PROVIDERS_CHANGED_EVENT, onProvidersChanged);
    return () => window.removeEventListener(PROVIDERS_CHANGED_EVENT, onProvidersChanged);
  }, [loadProviders]);

  const saveRouting = async (next: ModelRoutingDto) => {
    setRouting(next);
    try {
      const saved = unwrap(await api.updateModelRouting(next));
      setRouting(saved);
      setMessage("Modelos por função salvos.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const providerById = (id: string) => providers.find((p) => p.id === id);

  const routingProviderMissing = Boolean(
    tasks.some((task) => {
      const fields = TASK_MODEL_FIELDS[task.id];
      if (!fields) return false;
      const pid = routing[fields.provider as keyof ModelRoutingDto] as string | null;
      return Boolean(pid && !providerById(pid));
    }),
  );

  return (
    <section
      className="task-routing-section"
      data-testid="task-model-routing-section"
    >
      {!hideHeader && (
        <header className="task-routing-header">
          <h2 className="section-title">Modelos por função</h2>
          <p className="card-muted">
            Escolha qual <strong>conexão</strong> cadastrada em Provedores de IA
            será usada em cada parte do app. Cada conexão já define o modelo
            (ex.: Whisper, GPT-4o, LLaVA).
          </p>
        </header>
      )}
      {message && (
        <p className="settings-success" role="status">
          {message}
        </p>
      )}
      {routingProviderMissing && (
        <p className="settings-error" role="alert">
          Uma conexão selecionada foi removida — escolha outra ou use Automático.
        </p>
      )}
      {loading ? (
        <p className="card-muted">Carregando roteamento…</p>
      ) : providers.length === 0 ? (
        <p className="card-muted">
          Nenhuma conexão cadastrada. Adicione em{" "}
          <strong>Provedores de IA</strong> primeiro.
        </p>
      ) : (
        <div className="task-routing-grid">
          {tasks.map((task) => {
            const fields = TASK_MODEL_FIELDS[task.id];
            if (!fields) return null;
            const providerField = fields.provider as keyof ModelRoutingDto;
            const modelField = fields.model as keyof ModelRoutingDto;
            const providerId = (routing[providerField] as string | null) ?? "";
            const selected = providerById(providerId);
            const orphanSelection = Boolean(providerId && !selected);
            const missingKey =
              selected &&
              !selected.local_only &&
              selected.provider_kind !== "ollama" &&
              !selected.has_credential;

            return (
              <article
                key={task.id}
                className="task-routing-card"
                data-testid={`task-route-${task.id}`}
              >
                <div className="task-routing-card-head">
                  <strong>{task.label}</strong>
                  <span className="card-muted task-routing-cap">
                    {task.capability}
                  </span>
                </div>
                <label className="form-field">
                  <span className="form-field-label">Conexão / modelo</span>
                  <select
                    value={providerId}
                    onChange={(e) => {
                      const nextProvider = e.target.value || null;
                      const prov = nextProvider
                        ? providerById(nextProvider)
                        : undefined;
                      void saveRouting({
                        ...routing,
                        [providerField]: nextProvider,
                        [modelField]: prov?.model ?? null,
                      });
                    }}
                    data-testid={`route-${task.id}-provider`}
                  >
                    <option value="">Automático (primeiro compatível)</option>
                    {orphanSelection && (
                      <option value={providerId} disabled>
                        (conexão removida)
                      </option>
                    )}
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatProviderOptionLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                {selected?.model && (
                  <p className="card-muted task-routing-model-hint">
                    Modelo: <code>{selected.model}</code>
                  </p>
                )}
                {task.id === "transcription" &&
                  selected?.model &&
                  !isTranscriptionModelId(selected.model) && (
                    <p className="card-muted task-routing-model-hint" role="note">
                      Llama/GPT não transcrevem áudio. Na prática usamos{" "}
                      <strong>Whisper</strong> no mesmo provedor (ex.{" "}
                      <code>whisper-large-v3</code> no Groq). Para STT explícito,
                      crie uma conexão só com modelo Whisper.
                    </p>
                  )}
                {missingKey && (
                  <p className="settings-error" role="alert">
                    A conexão &quot;{selected.display_name}&quot; não tem API key.
                    Edite em Provedores ou adicione outra conexão com a mesma chave.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
