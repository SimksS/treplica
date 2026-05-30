import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type {
  DocumentsStorageSettingsDto,
  ImportDocumentsResultDto,
} from "../../lib/types";
import { WipeDataModal } from "./WipeDataModal";

export function DataStorageSettingsView() {
  const [settings, setSettings] = useState<DocumentsStorageSettingsDto | null>(
    null,
  );
  const [importDir, setImportDir] = useState("");
  const [importResult, setImportResult] =
    useState<ImportDocumentsResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wiping, setWiping] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = unwrap(await api.getDocumentsStorageSettings());
      setSettings(s);
      setImportDir(s.custom_export_dir ?? s.effective_export_dir);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickExportDirectory = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const picked = unwrap(await api.pickDocumentsExportDirectory());
      if (!picked) return;
      const updated = unwrap(
        await api.setDocumentsExportDirectory({ path: picked }),
      );
      setSettings(updated);
      setImportDir(picked);
      setMessage("Pasta de exportação atualizada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const resetExportDirectory = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = unwrap(
        await api.setDocumentsExportDirectory({ path: null }),
      );
      setSettings(updated);
      setImportDir(updated.effective_export_dir);
      setMessage("Voltando a usar a pasta padrão do Treplica.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const openExportDirectory = async () => {
    setError(null);
    try {
      unwrap(await api.openDocumentsExportDirectory());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const pickImportDirectory = async () => {
    setError(null);
    try {
      const picked = unwrap(await api.pickDocumentsImportDirectory());
      if (picked) setImportDir(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runImport = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setImportResult(null);
    try {
      const result = unwrap(
        await api.importSessionDocuments({
          directory: importDir.trim() || null,
        }),
      );
      setImportResult(result);
      if (result.imported > 0) {
        setMessage(
          `${result.imported} documento(s) importado(s). Abra o histórico para revisar.`,
        );
      } else if (result.skipped > 0) {
        setMessage("Nenhum documento novo — arquivos já estavam importados.");
      } else {
        setMessage("Nenhum arquivo Treplica (.md) encontrado na pasta.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleWipe = async (keepProviders: boolean) => {
    setWiping(true);
    setError(null);
    setMessage(null);
    try {
      unwrap(await api.wipeAllData(keepProviders));
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWiping(false);
    }
  };

  return (
    <section data-testid="data-storage-settings-view">
      <header className="settings-page-header">
        <h1>Arquivos e backup</h1>
        <p>
          Escolha onde salvar os documentos gerados nas sessões e importe
          arquivos exportados anteriormente.
        </p>
      </header>

      {error && (
        <p className="form-error" role="alert" data-testid="storage-settings-error">
          {error}
        </p>
      )}
      {message && (
        <p className="card-muted" data-testid="storage-settings-message">
          {message}
        </p>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="card-label">Pasta de exportação</p>
        <p className="card-muted" style={{ marginBottom: 12 }}>
          Resumos, e-mails de follow-up e outros documentos gerados são salvos
          como Markdown (.md) nesta pasta.
        </p>

        {settings && (
          <dl className="storage-settings-dl" data-testid="storage-settings-paths">
            <dt>Pasta em uso</dt>
            <dd data-testid="effective-export-dir">{settings.effective_export_dir}</dd>
            <dt>Padrão do Treplica</dt>
            <dd>{settings.default_export_dir}</dd>
          </dl>
        )}

        <div className="storage-settings-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={() => void pickExportDirectory()}
            data-testid="btn-pick-export-dir"
          >
            Escolher pasta…
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading || !settings?.custom_export_dir}
            onClick={() => void resetExportDirectory()}
            data-testid="btn-reset-export-dir"
          >
            Usar pasta padrão
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={loading}
            onClick={() => void openExportDirectory()}
            data-testid="btn-open-export-dir"
          >
            Abrir pasta
          </button>
        </div>
      </div>

      <div className="card">
        <p className="card-label">Importar documentos</p>
        <p className="card-muted" style={{ marginBottom: 12 }}>
          Se você reinstalar o Treplica ou trocar de máquina, importe a pasta
          onde os arquivos .md foram salvos. Sessões ausentes serão recriadas no
          histórico com base no identificador do arquivo.
        </p>

        <label className="card-label" htmlFor="import-dir-input">
          Pasta para importar
        </label>
        <div className="storage-settings-import-row">
          <input
            id="import-dir-input"
            className="input-text"
            value={importDir}
            onChange={(e) => setImportDir(e.target.value)}
            placeholder="Caminho da pasta com arquivos .md"
            data-testid="import-dir-input"
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={() => void pickImportDirectory()}
            data-testid="btn-pick-import-dir"
          >
            Procurar…
          </button>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: 12 }}
          disabled={loading || !importDir.trim()}
          onClick={() => void runImport()}
          data-testid="btn-run-import"
        >
          {loading ? "Importando…" : "Importar documentos"}
        </button>

        {importResult && (
          <div
            className="storage-import-result"
            data-testid="import-result-summary"
          >
            <p>
              Importados: <strong>{importResult.imported}</strong> · Ignorados
              (já existentes): <strong>{importResult.skipped}</strong> ·
              Sessões criadas: <strong>{importResult.sessions_created}</strong>
            </p>
            {importResult.errors.length > 0 && (
              <ul className="storage-import-errors">
                {importResult.errors.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card wipe-danger-card" style={{ marginTop: 16 }}>
        <p className="card-label" style={{ color: "rgba(239, 68, 68, 0.85)" }}>
          Zona de perigo
        </p>
        <p className="card-muted" style={{ marginBottom: 12 }}>
          Apaga permanentemente todos os dados do Treplica neste dispositivo: sessões,
          transcrições, sugestões e histórico. Os arquivos exportados na pasta de backup
          não são afetados.
        </p>
        <button
          type="button"
          className="btn-danger-outline"
          onClick={() => setWipeModalOpen(true)}
          disabled={wiping}
          data-testid="btn-open-wipe-modal"
        >
          Excluir todos os dados…
        </button>
      </div>

      <WipeDataModal
        open={wipeModalOpen}
        onClose={() => setWipeModalOpen(false)}
        onConfirm={(keepProviders) => void handleWipe(keepProviders)}
        loading={wiping}
      />

      <style>{`
        .wipe-danger-card {
          border-color: rgba(239, 68, 68, 0.25);
        }
        .btn-danger-outline {
          padding: 7px 16px;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid rgba(239, 68, 68, 0.5);
          background: transparent;
          color: rgba(239, 68, 68, 0.9);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-danger-outline:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.7);
        }
        .btn-danger-outline:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </section>
  );
}
