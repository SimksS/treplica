import { useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";

interface Props {
  sessionId: string;
  onAcknowledged: () => void;
}

export function SessionHostedAckBanner({ sessionId, onAcknowledged }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      unwrap(await api.acknowledgeSessionHostedData(sessionId));
      onAcknowledged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" data-testid="session-hosted-ack-banner" role="alert">
      <p>
        O modo <strong>Hosted por sessão</strong> exige confirmação antes de enviar áudio ou
        texto a providers na nuvem nesta reunião.
      </p>
      {error && <p className="form-error">{error}</p>}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void confirm()}
        disabled={loading}
      >
        {loading ? "Confirmando…" : "Permitir envio à nuvem nesta sessão"}
      </button>
    </div>
  );
}

export function isHostedAckRequiredError(message: string): boolean {
  return message.includes("hosted_per_session_requires_acknowledgment");
}
