import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { UpdateCheckDto } from "../../lib/types";

export function UpdateSettingsView() {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [check, setCheck] = useState<UpdateCheckDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => {});
  }, []);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = unwrap(await api.checkForAppUpdate());
      setCheck(result);
      if (!result.available) {
        setMessage("Você está na versão mais recente disponível.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCheck(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const runInstall = async () => {
    setInstalling(true);
    setError(null);
    setMessage(null);
    try {
      const msg = unwrap(await api.installAppUpdate());
      setMessage(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <section data-testid="update-settings-view">
      <header className="settings-page-header">
        <h1>Atualizações</h1>
        <p>
          Verifique se há atualizações disponíveis para o Treplica.
          A instalação só ocorre com sua confirmação.
        </p>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="card-muted">{message}</p>}

      <div className="storage-settings-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runCheck()}
          disabled={loading || installing}
        >
          {loading ? "Verificando…" : "Verificar atualizações"}
        </button>
        {check?.available && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void runInstall()}
            disabled={installing}
          >
            {installing ? "Instalando…" : `Instalar v${check.latest_version ?? ""}`}
          </button>
        )}
      </div>

      <dl className="storage-settings-dl">
        <dt>Versão atual</dt>
        <dd>{currentVersion ?? check?.current_version ?? "—"}</dd>
        {check?.latest_version && (
          <>
            <dt>Última versão disponível</dt>
            <dd>{check.latest_version}</dd>
          </>
        )}
      </dl>
      {check?.notes && (
        <div className="card-muted" style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
          {check.notes}
        </div>
      )}
    </section>
  );
}
