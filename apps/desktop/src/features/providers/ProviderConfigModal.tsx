import { useEffect, useState } from "react";
import { IconClose } from "../../components/layout/Icons";
import type { ProviderConfigDto } from "../../lib/types";

export interface ProviderFormState {
  provider_kind: string;
  display_name: string;
  base_url: string;
  model: string;
  local_only: boolean;
  api_key: string;
  /** Allow non-allowlisted HTTPS endpoints (openai_compatible / custom_api). */
  allow_custom_endpoint: boolean;
}

const HOSTED_KINDS = [
  { id: "nvidia", label: "NVIDIA NIM", hint: "integrate.api.nvidia.com" },
  { id: "openai", label: "OpenAI", hint: "api.openai.com" },
  { id: "anthropic", label: "Anthropic", hint: "Claude API" },
  { id: "groq", label: "Groq", hint: "Alta velocidade" },
  {
    id: "openai_compatible",
    label: "API personalizada",
    hint: "OpenAI-compatible ou gateway",
  },
] as const;

const DEFAULT_FORM: ProviderFormState = {
  provider_kind: "openai_compatible",
  display_name: "",
  base_url: "",
  model: "",
  local_only: false,
  api_key: "",
  allow_custom_endpoint: false,
};

function presetForKind(kind: string): Partial<ProviderFormState> {
  if (kind === "ollama") {
    return {
      provider_kind: "ollama",
      display_name: "Ollama (local)",
      base_url: "http://127.0.0.1:11434",
      model: "llama3.2",
      local_only: true,
      api_key: "",
    };
  }
  const hosted = HOSTED_KINDS.find((k) => k.id === kind);
  if (kind === "nvidia") {
    return {
      provider_kind: "nvidia",
      display_name: "NVIDIA NIM",
      base_url: "https://integrate.api.nvidia.com/v1",
      model: "meta/llama-3.1-70b-instruct",
      local_only: false,
      api_key: "",
    };
  }
  return {
    provider_kind: kind,
    display_name: hosted?.label ?? "",
    base_url: kind === "openai_compatible" ? "" : "",
    model: "",
    local_only: false,
    api_key: "",
    allow_custom_endpoint: false,
  };
}

function needsCustomEndpointFlag(kind: string): boolean {
  return kind === "openai_compatible" || kind === "custom_api";
}

function formFromProvider(provider: ProviderConfigDto): ProviderFormState {
  return {
    provider_kind: provider.provider_kind,
    display_name: provider.display_name,
    base_url: provider.base_url ?? "",
    model: provider.model ?? "",
    local_only: provider.local_only,
    api_key: "",
    allow_custom_endpoint: needsCustomEndpointFlag(provider.provider_kind),
  };
}

interface Props {
  open: boolean;
  initialKind?: string;
  initialPreset?: Partial<ProviderFormState>;
  editingProvider?: ProviderConfigDto | null;
  /** When adding another model on the same API, reuse this connection's key. */
  credentialDonor?: ProviderConfigDto | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (form: ProviderFormState) => void;
}

export function ProviderConfigModal({
  open,
  initialKind = "openai_compatible",
  initialPreset,
  editingProvider = null,
  credentialDonor = null,
  loading,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ProviderFormState>(DEFAULT_FORM);
  const isEdit = Boolean(editingProvider);

  useEffect(() => {
    if (!open) return;
    if (editingProvider) {
      setForm(formFromProvider(editingProvider));
    } else {
      setForm({
        ...DEFAULT_FORM,
        ...presetForKind(initialKind),
        ...initialPreset,
      });
    }
  }, [open, initialKind, initialPreset, editingProvider]);

  if (!open) return null;

  const isLocal = form.provider_kind === "ollama";
  const isCustom = needsCustomEndpointFlag(form.provider_kind);
  const reuseCredential = Boolean(credentialDonor && !isEdit && !isLocal);
  const title = isEdit
    ? `Editar ${editingProvider?.display_name ?? "provider"}`
    : isLocal
      ? "Configurar Ollama"
      : isCustom
        ? "API personalizada"
        : `Conectar ${HOSTED_KINDS.find((k) => k.id === form.provider_kind)?.label ?? "provider"}`;

  const update = (patch: Partial<ProviderFormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="provider-modal-title"
      data-testid="provider-config-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="provider-modal">
        <header className="provider-modal-header">
          <div>
            <h2 id="provider-modal-title" className="provider-modal-title">
              {title}
            </h2>
            <p className="provider-modal-subtitle">
              {isLocal
                ? "Modelos locais via Ollama — nada sai do dispositivo."
                : reuseCredential
                  ? `Usa a mesma API key de "${credentialDonor!.display_name}". Defina só o modelo desta conexão.`
                  : "Credenciais ficam no cofre do sistema ou na pasta local do app."}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            <IconClose />
          </button>
        </header>

        <div className="provider-modal-body">
          {!isLocal && !isEdit && (
            <fieldset className="provider-fieldset">
              <legend className="provider-legend">Tipo de API</legend>
              <div className="provider-kind-grid">
                {HOSTED_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    className={`provider-kind-option ${form.provider_kind === k.id ? "active" : ""}`}
                    onClick={() => update(presetForKind(k.id))}
                  >
                    <span className="provider-kind-label">{k.label}</span>
                    <span className="provider-kind-hint">{k.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {isLocal && (
            <input type="hidden" value="ollama" data-testid="provider-kind-select" readOnly />
          )}

          <fieldset className="provider-fieldset">
            <legend className="provider-legend">Identificação</legend>
            <div className="provider-form-grid">
              <label className="form-field">
                <span className="form-field-label">Nome exibido</span>
                <input
                  value={form.display_name}
                  placeholder={isLocal ? "Ollama (local)" : "Minha API"}
                  onChange={(e) => update({ display_name: e.target.value })}
                  data-testid="provider-name-input"
                />
              </label>
              <label className="form-field">
                <span className="form-field-label">Modelo padrão</span>
                <input
                  value={form.model}
                  placeholder={isLocal ? "llama3.2" : "gpt-4o-mini"}
                  onChange={(e) => update({ model: e.target.value })}
                  data-testid="provider-model-input"
                />
                <span className="form-field-hint">
                  Um modelo por conexão na mesma API. Depois escolha qual conexão
                  usar em cada função em Modelos por função.
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="provider-fieldset">
            <legend className="provider-legend">Conexão</legend>
            <label className="form-field form-field--full">
              <span className="form-field-label">Base URL</span>
              <input
                value={form.base_url}
                placeholder={
                  isLocal
                    ? "http://127.0.0.1:11434"
                    : isCustom
                      ? "https://sua-api.com/v1"
                      : "https://api.openai.com/v1"
                }
                onChange={(e) => update({ base_url: e.target.value })}
              />
              <span className="form-field-hint">
                {isCustom
                  ? "Endpoint compatível com OpenAI (chat/completions)."
                  : "Deixe em branco para usar o endpoint padrão do provedor."}
              </span>
            </label>
            {isCustom && (
              <label className="form-field form-field--checkbox">
                <input
                  type="checkbox"
                  checked={form.allow_custom_endpoint}
                  onChange={(e) =>
                    update({ allow_custom_endpoint: e.target.checked })
                  }
                  data-testid="provider-allow-custom-endpoint"
                />
                <span>
                  Permitir endpoint customizado ou LAN (não listado na allowlist)
                </span>
                <span className="form-field-hint">
                  Necessário para gateways, Azure OpenAI, Ollama remoto ou APIs
                  self-hosted. Sem isso, só hosts conhecidos são aceitos.
                </span>
              </label>
            )}
          </fieldset>

          {!isLocal && !reuseCredential && (
            <fieldset className="provider-fieldset">
              <legend className="provider-legend">Credenciais</legend>
              <label className="form-field form-field--full">
                <span className="form-field-label">API Key</span>
                <input
                  type="password"
                  value={form.api_key}
                  placeholder={isEdit ? "Nova chave (opcional)" : "sk-…"}
                  autoComplete="off"
                  onChange={(e) => update({ api_key: e.target.value })}
                  data-testid="provider-api-key"
                />
                <span className="form-field-hint">
                  {isEdit
                    ? editingProvider?.has_credential
                      ? "Chave salva. Preencha só se quiser substituir; deixe vazio para manter."
                      : "Informe a chave para salvar neste computador."
                    : "Armazenada localmente; nunca enviada para nossos servidores."}
                </span>
              </label>
            </fieldset>
          )}
          {reuseCredential && (
            <p className="form-field-hint" data-testid="provider-shared-key-hint">
              A chave de <strong>{credentialDonor!.display_name}</strong> será
              reutilizada automaticamente para este modelo.
            </p>
          )}
        </div>

        <footer className="provider-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => onSave(form)}
            data-testid="btn-save-provider"
          >
            {isEdit ? "Salvar alterações" : "Salvar provider"}
          </button>
        </footer>
      </div>
    </div>
  );
}

