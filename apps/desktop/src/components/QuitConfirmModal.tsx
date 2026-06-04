interface Props {
  open: boolean;
  onQuit: () => void;
  onMinimize: () => void;
  onCancel: () => void;
}

export function QuitConfirmModal({ open, onQuit, onMinimize, onCancel }: Props) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quit-modal-title"
      data-testid="quit-confirm-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="end-session-modal card">
        <h2 id="quit-modal-title" className="card-title">
          Deseja Sair do Aplicativo?
        </h2>
        <p className="card-muted">
          Minimizar mantém o aplicativo ativo em segundo plano.
        </p>
        <div className="end-session-modal-actions">
          <button
            type="button"
            className="btn-primary"
            data-testid="quit-confirm"
            onClick={onQuit}
          >
            Sair
          </button>
          <button
            type="button"
            className="btn-secondary"
            data-testid="quit-minimize"
            onClick={onMinimize}
          >
            Minimizar
          </button>
        </div>
      </div>
    </div>
  );
}
