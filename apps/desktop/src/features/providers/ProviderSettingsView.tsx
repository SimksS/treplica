import { useCallback, useEffect, useMemo, useState } from "react";
import { AiTypingIndicator } from "../../components/AiTypingIndicator";
import * as api from "../../lib/tauriClient";
import { listenWhenTauri } from "../../lib/tauriEvents";
import { unwrap } from "../../lib/tauriClient";
import {
  findCatalogMatches,
  findCredentialDonorForPreset,
  PROVIDER_CATALOG,
  providersWithoutCatalog,
  suggestNewConnectionName,
  type ProviderCatalogEntry,
} from "../../lib/providerCatalog";
import { notifyProvidersChanged } from "../../lib/providerSync";
import {
  isProviderOperational,
  providerConnectionStatusLabel,
} from "../../lib/providerStatus";
import type { AiActivityEventDto, ProviderConfigDto } from "../../lib/types";
import {
  ProviderConfigModal,
  type ProviderFormState,
} from "./ProviderConfigModal";
import { ProviderPresetCard } from "./ProviderPresetCard";

type Filter = "all" | "local" | "hosted";

function friendlyProviderError(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("api key not configured") || r.includes("sem chave") || r.includes("key not configured"))
    return "Chave de API não configurada. Clique em Editar e adicione sua chave.";
  if (r.includes("auth") || r.includes("401") || r.includes("403") || r.includes("unauthorized") || r.includes("invalid_api_key"))
    return "Chave de API inválida ou expirada. Verifique se copiou corretamente.";
  if (r.includes("modelo") && (r.includes("não encontrado") || r.includes("unavailable") || r.includes("not found")))
    return "Modelo não encontrado na sua conta. Verifique o nome do modelo nas configurações.";
  if (r.includes("base_url") || r.includes("endpoint") || r.includes("404") || r.includes("405"))
    return "Endereço do servidor incorreto. Verifique a URL configurada.";
  if (r.includes("timeout") || r.includes("timed out"))
    return "O servidor demorou demais para responder. Verifique sua conexão ou tente novamente.";
  if (r.includes("network") || r.includes("connect") || r.includes("dns") || r.includes("unreachable") || r.includes("inacessível"))
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  if (r.includes("ollama") || r.includes("localhost") || r.includes("127.0.0.1"))
    return "Servidor local inacessível. Verifique se o Ollama (ou LM Studio) está rodando.";
  return "Algo deu errado ao testar a conexão. Verifique suas configurações e tente novamente.";
}

export function ProviderSettingsView() {
  const [providers, setProviders] = useState<ProviderConfigDto[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<
    { providerId: string; message: string; kind: "success" | "error" } | null
  >(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState("openai_compatible");
  const [modalPreset, setModalPreset] = useState<Partial<ProviderFormState>>();
  const [editingProvider, setEditingProvider] = useState<ProviderConfigDto | null>(
    null,
  );
  const [credentialDonor, setCredentialDonor] = useState<ProviderConfigDto | null>(
    null,
  );

  const openPreset = (entry: ProviderCatalogEntry) => {
    if (entry.comingSoon) return;
    const existing = findCatalogMatches(entry, providers);
    setEditingProvider(null);
    setCredentialDonor(findCredentialDonorForPreset(entry, providers) ?? null);
    setModalKind(entry.modalKind);
    setModalPreset({
      ...entry.formPreset,
      display_name: suggestNewConnectionName(entry, existing),
      api_key: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (provider: ProviderConfigDto) => {
    setEditingProvider(provider);
    setCredentialDonor(null);
    setModalKind(provider.provider_kind);
    setModalPreset(undefined);
    setModalOpen(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProviders(unwrap(await api.listProviderConfigs()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let unlistenStarted: (() => void) | undefined;
    let unlistenFinished: (() => void) | undefined;
    void (async () => {
      unlistenStarted = await listenWhenTauri<AiActivityEventDto>(
        "ai-activity-started",
        (payload) => {
          if (payload.purpose !== "guidance") return;
          if (!payload.sessionId.startsWith("provider-test-")) return;
          setTestingProviderId(payload.sessionId.replace("provider-test-", ""));
        },
      );
      unlistenFinished = await listenWhenTauri<AiActivityEventDto>(
        "ai-activity-finished",
        (payload) => {
          if (payload.purpose !== "guidance") return;
          if (!payload.sessionId.startsWith("provider-test-")) return;
          setTestingProviderId(null);
        },
      );
    })();
    return () => {
      unlistenStarted?.();
      unlistenFinished?.();
    };
  }, []);

  const catalogLocal = useMemo(
    () => PROVIDER_CATALOG.filter((e) => e.section === "local"),
    [],
  );
  const catalogHosted = useMemo(
    () => PROVIDER_CATALOG.filter((e) => e.section === "hosted"),
    [],
  );
  const extraProviders = useMemo(
    () => providersWithoutCatalog(providers),
    [providers],
  );

  const showLocal = filter === "all" || filter === "local";
  const showHosted = filter === "all" || filter === "hosted";

  const handleSave = async (form: ProviderFormState) => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = form.api_key.trim() || null;
      if (editingProvider) {
        unwrap(
          await api.updateProviderConfig(editingProvider.id, {
            display_name: form.display_name || editingProvider.display_name,
            base_url: form.base_url || null,
            model: form.model || null,
            local_only: form.provider_kind === "ollama" || form.local_only,
            allow_custom_endpoint: form.allow_custom_endpoint,
            ...(apiKey ? { api_key: apiKey } : {}),
          }),
        );
      } else {
        unwrap(
          await api.createProviderConfig({
            provider_kind: form.provider_kind,
            display_name: form.display_name || "Novo provider",
            base_url: form.base_url || null,
            model: form.model || null,
            local_only: form.provider_kind === "ollama" || form.local_only,
            allow_custom_endpoint: form.allow_custom_endpoint,
            api_key: apiKey,
          }),
        );
      }
      setModalOpen(false);
      setEditingProvider(null);
      setCredentialDonor(null);
      setModalPreset(undefined);
      await load();
      notifyProvidersChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id: string) => {
    setError(null);
    setTestFeedback(null);
    setTestingProviderId(id);
    try {
      await api.testProviderConfig(id);
      setTestFeedback({ providerId: id, message: "Tudo certo! ", kind: "success" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setTestFeedback({ providerId: id, message: friendlyProviderError(raw), kind: "error" });
    } finally {
      setTestingProviderId(null);
    }
  };

  useEffect(() => {
    if (!testFeedback) return;
    const id = window.setTimeout(() => setTestFeedback(null), 5000);
    return () => window.clearTimeout(id);
  }, [testFeedback]);

  const renderExtraTile = (p: ProviderConfigDto) => (
    <li key={p.id} className="provider-catalog-card card" data-testid="provider-item">
      <div className="provider-catalog-card-top">
        <span className="provider-catalog-icon">◇</span>
        <span
          className={`provider-catalog-status ${
            isProviderOperational(p) ? "connected" : ""
          }`}
        >
          {providerConnectionStatusLabel(p)}
        </span>
      </div>
      <h3 className="provider-catalog-title">{p.display_name}</h3>
      <p className="provider-catalog-desc card-muted">
        {p.provider_kind} · {p.model ?? "modelo padrão"}
      </p>
      {testingProviderId === p.id && (
        <AiTypingIndicator label="Testando conexão" />
      )}
      <div className="provider-catalog-actions">
        <button
          type="button"
          className="btn-catalog"
          onClick={() => openEditModal(p)}
          data-testid="btn-edit-provider"
        >
          Gerenciar conexão
        </button>
        {p.enabled && (
          <button
            type="button"
            className="btn-catalog btn-catalog--ghost"
            onClick={() => void handleTest(p.id)}
            disabled={testingProviderId === p.id}
            data-testid={`btn-test-connection-${p.id}`}
          >
            {testingProviderId === p.id ? "Testando…" : "Testar"}
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="provider-settings-page" data-testid="provider-settings-view">
      <header className="settings-page-header settings-page-header--row">
        <div>
          <h1>Provedores de IA</h1>
          <p>
            Conecte suas APIs de nuvem favoritas ou execute modelos de forma
            privada no dispositivo. Configure autenticação e servidores locais
            abaixo.
          </p>
        </div>
        <div className="pill-group" data-testid="provider-filter">
          {(["all", "local", "hosted"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f === "local" ? "Local" : "Nuvem"}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p className="settings-error" data-testid="provider-error" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="card-muted">Atualizando provedores…</p>}

      <div className="provider-sections">
        {showLocal && (
          <section className="provider-section">
            <h2 className="section-title">Local e no dispositivo</h2>
            <ul className="provider-grid">
              {catalogLocal.map((entry) => {
                const connections = findCatalogMatches(entry, providers);
                return (
                  <ProviderPresetCard
                    key={entry.id}
                    entry={entry}
                    connections={connections}
                    onPrimaryAction={() => openPreset(entry)}
                    onAddConnection={() => openPreset(entry)}
                    onManage={(p) => openEditModal(p)}
                    onTest={(id) => void handleTest(id)}
                    testingProviderId={testingProviderId}
                    testFeedback={testFeedback}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {showHosted && (
          <section className="provider-section">
            <h2 className="section-title">APIs de nuvem</h2>
            <ul className="provider-grid">
              {catalogHosted.map((entry) => {
                const connections = findCatalogMatches(entry, providers);
                return (
                  <ProviderPresetCard
                    key={entry.id}
                    entry={entry}
                    connections={connections}
                    onPrimaryAction={() => openPreset(entry)}
                    onAddConnection={() => openPreset(entry)}
                    onManage={(p) => openEditModal(p)}
                    onTest={(id) => void handleTest(id)}
                    testingProviderId={testingProviderId}
                    testFeedback={testFeedback}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {extraProviders.length > 0 && (filter === "all" || filter === "hosted") && (
          <section className="provider-section">
            <h2 className="section-title">Outros provedores</h2>
            <ul className="provider-grid">{extraProviders.map(renderExtraTile)}</ul>
          </section>
        )}
      </div>

      <ProviderConfigModal
        open={modalOpen}
        initialKind={modalKind}
        initialPreset={modalPreset}
        editingProvider={editingProvider}
        credentialDonor={credentialDonor}
        loading={loading}
        onClose={() => {
          setModalOpen(false);
          setEditingProvider(null);
          setCredentialDonor(null);
          setModalPreset(undefined);
        }}
        onSave={(form) => void handleSave(form)}
      />
    </div>
  );
}
