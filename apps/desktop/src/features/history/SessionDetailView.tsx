import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { SessionDetailDto } from "../../lib/types";
import { DeleteSessionDialog } from "./DeleteSessionDialog";
import { SessionDetailTabs } from "./SessionDetailTabs";
import { SessionTitleEditor } from "./SessionTitleEditor";

interface Props {
  sessionId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export function SessionDetailView({ sessionId, onBack, onDeleted }: Props) {
  const [detail, setDetail] = useState<SessionDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = unwrap(await api.getSessionDetail(sessionId));
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async (docType: string) => {
    setLoading(true);
    setError(null);
    try {
      unwrap(await api.generateSessionDocument(sessionId, docType));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (documentId: string) => {
    try {
      const result = unwrap(await api.exportSessionDocument(documentId));
      setExportMsg(`Exportado: ${result.path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteDoc = async (documentId: string) => {
    try {
      unwrap(await api.deleteGeneratedDocument(documentId));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteSession = async () => {
    setLoading(true);
    setDeleteError(null);
    try {
      unwrap(await api.deleteSession(sessionId));
      setDeleteOpen(false);
      onDeleted();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!detail && loading) {
    return <p data-testid="detail-loading">Carregando…</p>;
  }

  if (!detail) {
    return (
      <p data-testid="detail-error" role="alert">
        {error ?? "Sessão não encontrada"}
      </p>
    );
  }

  return (
    <div data-testid="session-detail-view">
      <div className="detail-toolbar">
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
          data-testid="btn-back-history"
        >
          ← Voltar
        </button>
        <SessionTitleEditor
          sessionId={sessionId}
          title={detail.session.title}
          onRenamed={(title) =>
            setDetail((d) =>
              d ? { ...d, session: { ...d.session, title } } : d,
            )
          }
        />
        <button
          type="button"
          className="btn-danger"
          onClick={() => setDeleteOpen(true)}
          data-testid="btn-open-delete"
        >
          Excluir sessão
        </button>
      </div>
      {error && (
        <p className="detail-error" role="alert" data-testid="detail-error">
          {error}
        </p>
      )}
      {exportMsg && (
        <p className="export-msg" data-testid="export-success">
          {exportMsg}
        </p>
      )}

      <SessionDetailTabs
        detail={detail}
        loading={loading}
        onGenerate={(t) => void handleGenerate(t)}
        onExport={(id) => void handleExport(id)}
        onCopy={(c) => void navigator.clipboard.writeText(c)}
        onDeleteDoc={(id) => void handleDeleteDoc(id)}
      />

      <DeleteSessionDialog
        open={deleteOpen}
        sessionTitle={detail.session.title}
        loading={loading}
        error={deleteError}
        onConfirm={() => void handleDeleteSession()}
        onCancel={() => setDeleteOpen(false)}
      />

      <style>{`
        .detail-toolbar { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap; }
        .detail-title { margin: 0; flex: 1; font-size: 1.125rem; }
        .session-title-row { display: flex; align-items: center; gap: var(--space-sm); flex: 1; min-width: 0; }
        .session-title-editor { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-sm); flex: 1; }
        .session-title-input {
          flex: 1;
          min-width: 160px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-accent);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          color: var(--color-text);
          font-family: inherit;
        }
        .session-title-error { width: 100%; margin: 0; font-size: 0.75rem; color: var(--color-error); }
        .btn-danger { background: var(--color-error); color: white; }
        .detail-error { color: var(--color-error); }
        .export-msg { color: var(--color-success); font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
