interface Props {
  open: boolean;
  sessionTitle: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSessionDialog({
  open,
  sessionTitle,
  loading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" data-testid="delete-dialog-overlay">
      <div className="dialog" role="alertdialog" data-testid="delete-session-dialog">
        <h3>Excluir sessão?</h3>
        <p>
          A sessão <strong>{sessionTitle}</strong> e todos os artefatos locais
          (transcrição, orientações, documentos e exportações) serão removidos
          permanentemente.
        </p>
        {error && (
          <p className="dialog-error" data-testid="delete-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
            data-testid="btn-cancel-delete"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
            data-testid="btn-confirm-delete"
          >
            {loading ? "Excluindo…" : "Excluir"}
          </button>
        </div>
        <style>{`
          .dialog-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
          }
          .dialog {
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: var(--space-lg);
            max-width: 420px;
            width: 90%;
          }
          .dialog h3 { margin: 0 0 var(--space-sm); }
          .dialog p { margin: 0 0 var(--space-md); font-size: 0.875rem; color: var(--color-text-muted); }
          .dialog-error { color: var(--color-error); }
          .dialog-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; }
          .btn-danger {
            background: var(--color-error);
            color: white;
          }
          .btn-danger:hover:not(:disabled) { filter: brightness(1.1); }
        `}</style>
      </div>
    </div>
  );
}
