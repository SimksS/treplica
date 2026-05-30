import { useCallback, useEffect, useMemo, useState } from "react";
import { AiTypingIndicator } from "../../components/AiTypingIndicator";
import * as api from "../../lib/tauriClient";
import { listenWhenTauri } from "../../lib/tauriEvents";
import { unwrap } from "../../lib/tauriClient";
import {
  findCatalogMatches,
  findCredentialDonorForPreset,
  PROVIDER_CATALOG,
  suggestNewConnectionName,
  type ProviderCatalogEntry,
} from "../../lib/providerCatalog";
import { notifyProvidersChanged } from "../../lib/providerSync";
import type { AiActivityEventDto, ProviderConfigDto } from "../../lib/types";
import {
  ProviderConfigModal,
  type ProviderFormState,
} from "../providers/ProviderConfigModal";
import { ProviderPresetCard } from "../providers/ProviderPresetCard";

const SETUP_CATALOG = PROVIDER_CATALOG.filter((e) => !e.comingSoon);

export function SetupProvidersStep() {
  const [providers, setProviders] = useState<ProviderConfigDto[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<{
    providerId: string;
    message: string;
    kind: "success" | "error";
  } | null>(null);
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

  const selectedEntry = useMemo(
    () => SETUP_CATALOG.find((e) => e.id === selectedId),
    [selectedId],
  );

  const connections = useMemo(
    () =>
      selectedEntry ? findCatalogMatches(selectedEntry, providers) : [],
    [selectedEntry, providers],
  );

  const openPreset = (entry: ProviderCatalogEntry) => {
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
      const msg = unwrap(await api.testProviderConfig(id));
      setTestFeedback({ providerId: id, message: msg, kind: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTestFeedback({ providerId: id, message, kind: "error" });
    } finally {
      setTestingProviderId(null);
    }
  };

  useEffect(() => {
    if (!testFeedback) return;
    const id = window.setTimeout(() => setTestFeedback(null), 5000);
    return () => window.clearTimeout(id);
  }, [testFeedback]);

  const catalogLocal = useMemo(
    () => SETUP_CATALOG.filter((e) => e.section === "local"),
    [],
  );
  const catalogHosted = useMemo(
    () => SETUP_CATALOG.filter((e) => e.section === "hosted"),
    [],
  );

  return (
    <div className="setup-providers-step" data-testid="setup-providers-step">
      <label className="form-field setup-provider-select-field">
        <span className="form-field-label">Provedor de IA</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          data-testid="setup-provider-select"
        >
          <option value="">Selecione um provedor…</option>
          <optgroup label="Local e no dispositivo">
            {catalogLocal.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="APIs de nuvem">
            {catalogHosted.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {loading && !selectedEntry && (
        <p className="setup-muted">Carregando provedores…</p>
      )}

      {error && (
        <p className="setup-error" data-testid="setup-provider-error" role="alert">
          {error}
        </p>
      )}

      {selectedEntry && (
        <div className="setup-provider-panel" data-testid="setup-provider-panel">
          {loading && (
            <p className="setup-muted setup-provider-panel-status">Atualizando…</p>
          )}
          {testingProviderId &&
            connections.some((p) => p.id === testingProviderId) && (
              <AiTypingIndicator label="Testando conexão" />
            )}
          <ul className="setup-provider-card-list">
            <ProviderPresetCard
              entry={selectedEntry}
              connections={connections}
              onPrimaryAction={() => openPreset(selectedEntry)}
              onAddConnection={() => openPreset(selectedEntry)}
              onManage={(p) => openEditModal(p)}
              onTest={(id) => void handleTest(id)}
              testingProviderId={testingProviderId}
              testFeedback={testFeedback}
            />
          </ul>
        </div>
      )}

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
