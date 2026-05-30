interface Props {
  open: boolean;
  title: string;
  message: string;
  ending?: boolean;
  confirmLabel?: string;
  keepActiveLabel?: string;
  cancelLabel?: string;
  onConfirmEnd: () => void;
  onKeepActive: () => void;
  onCancel: () => void;
}

export function EndSessionConfirmModal({
  open,
  title,
  message,
  ending = false,
  confirmLabel = "Encerrar reunião",
  keepActiveLabel = "Manter ativa em segundo plano",
  cancelLabel = "Cancelar",
  onConfirmEnd,
  onKeepActive,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-session-modal-title"
      data-testid="end-session-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !ending) onCancel();
      }}
    >
      <div className="end-session-modal card">
        <h2 id="end-session-modal-title" className="card-title">
          {title}
        </h2>
        <p className="card-muted">{message}</p>
        <div className="end-session-modal-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={ending}
            data-testid="end-session-confirm"
            onClick={onConfirmEnd}
          >
            {ending ? "Encerrando…" : confirmLabel}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={ending}
            data-testid="end-session-keep-active"
            onClick={onKeepActive}
          >
            {keepActiveLabel}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={ending}
            data-testid="end-session-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
