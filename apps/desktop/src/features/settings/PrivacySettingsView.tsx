import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { PrivacySettingsDto } from "../../lib/types";

const MODES = [
  { id: "local_only", label: "Somente local", desc: "Nenhum dado sai do dispositivo." },
  {
    id: "hosted_per_session",
    label: "Hosted por sessão",
    desc: "Confirmação antes de cada uso de provider na nuvem.",
  },
  {
    id: "hosted_default",
    label: "Hosted padrão",
    desc: "Permite providers na nuvem quando configurados.",
  },
];

export function PrivacySettingsView() {
  const [settings, setSettings] = useState<PrivacySettingsDto | null>(null);
  const [pendingMode, setPendingMode] = useState("local_only");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = unwrap(await api.getPrivacySettings());
      setSettings(s);
      setPendingMode(s.privacy_mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMode = async (mode: string) => {
    setLoading(true);
    setError(null);
    try {
      const s = unwrap(await api.updatePrivacySettings(mode));
      setSettings(s);
      setPendingMode(s.privacy_mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const acknowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = unwrap(await api.acknowledgeHostedProviderWarning());
      setSettings(s);
      if (pendingMode !== "local_only") {
        await saveMode(pendingMode);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const showWarning =
    pendingMode !== "local_only" &&
    settings &&
    !settings.hosted_warning_acknowledged;

  return (
    <section data-testid="privacy-settings-view">
      <header className="settings-page-header">
        <h1>Privacidade</h1>
        <p>Controle o que permanece local e quando providers na nuvem podem ser usados.</p>
      </header>
      {MODES.map((m) => (
        <label key={m.id} className="privacy-option" data-testid={`privacy-${m.id}`}>
          <input
            type="radio"
            name="privacy"
            checked={pendingMode === m.id}
            onChange={() => setPendingMode(m.id)}
          />
          <span>
            <strong>{m.label}</strong>
            <span className="privacy-desc">{m.desc}</span>
          </span>
        </label>
      ))}

      {showWarning && (
        <div className="privacy-warning panel" data-testid="hosted-privacy-warning">
          <p>
            Providers hosted enviam trechos de conversa para servidores externos.
            Confirme que entende os riscos antes de ativar.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void acknowledge()}
            disabled={loading}
            data-testid="btn-ack-hosted-warning"
          >
            Entendo e aceito
          </button>
        </div>
      )}

      {!showWarning && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => void saveMode(pendingMode)}
          disabled={loading || pendingMode === settings?.privacy_mode}
          data-testid="btn-save-privacy"
        >
          Salvar modo de privacidade
        </button>
      )}

      {error && (
        <p className="settings-error" data-testid="privacy-error" role="alert">
          {error}
        </p>
      )}

      <style>{`
        .privacy-option { display: flex; gap: var(--space-sm); align-items: flex-start; margin-bottom: var(--space-md); cursor: pointer; }
        .privacy-option strong { display: block; }
        .privacy-desc { font-size: 0.8125rem; color: var(--color-text-muted); }
        .privacy-warning { border-left: 3px solid var(--color-warning); margin: var(--space-md) 0; }
        .settings-error { color: var(--color-error); margin-top: var(--space-sm); }
      `}</style>
    </section>
  );
}
