import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (keepProviders: boolean) => void;
  loading: boolean;
}

export function WipeDataModal({ open, onClose, onConfirm, loading }: Props) {
  const [keepProviders, setKeepProviders] = useState(true);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal aria-labelledby="wipe-modal-title">
      <div className="modal-panel wipe-modal-panel">
        <h2 id="wipe-modal-title" className="wipe-modal-title">
          Excluir todos os dados
        </h2>

        <p className="wipe-modal-desc">
          Esta ação apagará permanentemente todos os dados do Treplica neste dispositivo:
        </p>

        <ul className="wipe-modal-list">
          <li>Todas as sessões, transcrições e resumos</li>
          <li>Sugestões de orientação geradas</li>
          <li>Documentos criados pelo assistente</li>
          <li>Registros de chamadas aos providers de IA</li>
          <li>Logs de auditoria e privacidade</li>
        </ul>

        <label className="wipe-modal-checkbox-row">
          <input
            type="checkbox"
            checked={keepProviders}
            onChange={(e) => setKeepProviders(e.target.checked)}
            disabled={loading}
          />
          <span>
            <strong>Manter providers e credenciais de API</strong>
            <span className="card-muted" style={{ display: "block", fontSize: "0.8125rem" }}>
              Suas chaves de API e configurações de conexão serão preservadas.
            </span>
          </span>
        </label>

        <p className="wipe-modal-warning">
          Esta ação não pode ser desfeita. Os arquivos exportados na pasta de backup
          não serão removidos.
        </p>

        <div className="wipe-modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => onConfirm(keepProviders)}
            disabled={loading}
            data-testid="btn-confirm-wipe"
          >
            {loading ? "Excluindo…" : "Excluir tudo"}
          </button>
        </div>
      </div>

      <style>{`
        .wipe-modal-panel {
          max-width: 440px;
          width: 100%;
        }
        .wipe-modal-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 12px;
          color: var(--color-text);
        }
        .wipe-modal-desc {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 10px;
        }
        .wipe-modal-list {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 16px;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .wipe-modal-checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          padding: 12px;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid var(--color-border, rgba(255,255,255,0.1));
          background: rgba(255,255,255,0.03);
          margin-bottom: 16px;
        }
        .wipe-modal-checkbox-row input[type="checkbox"] {
          margin-top: 2px;
          flex-shrink: 0;
          width: 15px;
          height: 15px;
        }
        .wipe-modal-warning {
          font-size: 0.8125rem;
          color: rgba(251, 191, 36, 0.9);
          background: rgba(251, 191, 36, 0.07);
          border: 1px solid rgba(251, 191, 36, 0.25);
          border-radius: var(--radius-sm, 8px);
          padding: 10px 12px;
          margin: 0 0 20px;
        }
        .wipe-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-danger {
          padding: 8px 18px;
          border-radius: var(--radius-sm, 8px);
          border: none;
          background: rgba(239, 68, 68, 0.85);
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-danger:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.95);
        }
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
