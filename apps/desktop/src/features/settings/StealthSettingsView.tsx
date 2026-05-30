import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { StealthStatusDto } from "../../lib/types";

function exclusionLabel(state: string): string {
  switch (state) {
    case "active":
      return "Invisível em prints e compartilhamento";
    case "unsupported":
      return "Não suportado neste sistema";
    case "failed":
      return "Falha ao ativar proteção";
    default:
      return "Verificando…";
  }
}

export function StealthSettingsView() {
  const [status, setStatus] = useState<StealthStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(unwrap(await api.getStealthStatus()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exclusionActive = status?.capture_exclusion === "active";

  return (
    <section data-testid="stealth-settings-view">
      <header className="settings-page-header">
        <h1>Modo discreto</h1>
        <p>
          Overlay flutuante que você vê no monitor, mas que não aparece em capturas de tela,
          prints (Win+Shift+S) nem na maioria dos apps de compartilhamento (Teams, Zoom, OBS).
          Áudio, idioma e captura de tela são configurados ao{" "}
          <strong>iniciar uma sessão</strong> na tela principal.
        </p>
      </header>

      {status?.platform === "linux" && (
        <div className="card linux-disclaimer" role="note" data-testid="linux-disclaimer">
          <strong>Não suportado no Linux</strong>
          <p style={{ marginTop: 6, marginBottom: 0 }}>
            A exclusão de captura de tela (modo invisível em prints e compartilhamento) requer
            APIs do sistema operacional disponíveis apenas no Windows 10 (2004+) e macOS. No
            Linux não existe um mecanismo padronizado equivalente — o overlay ficará visível
            normalmente na tela, mas também aparecerá em capturas e compartilhamentos.
          </p>
        </div>
      )}

      {status && (
        <div
          className={`card stealth-status ${exclusionActive ? "stealth-status-ok" : ""}`}
          data-testid="stealth-status-panel"
          style={{ marginBottom: 16 }}
        >
          <p>
            Overlay:{" "}
            <strong data-testid="stealth-visible-label">
              {status.overlay_visible ? "visível" : "oculto"}
            </strong>
          </p>
          <p>
            Proteção de captura:{" "}
            <strong data-testid="stealth-capture-label">
              {exclusionLabel(status.capture_exclusion)}
            </strong>
            {status.platform && (
              <span className="card-muted"> ({status.platform})</span>
            )}
          </p>
          <p className="card-muted" style={{ fontSize: "0.875rem", marginTop: 8 }}>
            {status.capture_exclusion_detail}
          </p>
          <p style={{ marginTop: 12 }}>
            Atalho: <code>{status.hotkey}</code>
          </p>
        </div>
      )}

      <div className="stealth-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => void api.toggleStealthOverlay().then(refresh)}
          data-testid="btn-toggle-stealth"
        >
          {status?.overlay_visible ? "Ocultar" : "Mostrar"} overlay
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            void api
              .setStealthAlwaysOnTop(!(status?.always_on_top ?? true))
              .then(refresh)
          }
          data-testid="btn-always-on-top"
        >
          {status?.always_on_top ? "Desativar" : "Ativar"} sempre no topo
        </button>
      </div>

      <p className="card-muted" style={{ marginTop: 16, fontSize: "0.8125rem" }}>
        Limitação: a proteção depende do Windows 10 (2004+) ou macOS. Fotos com outro celular
        apontado para o monitor ainda mostram o overlay. No Linux a exclusão ainda não está
        disponível.
      </p>

      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}

      <style>{`
        .stealth-status-ok {
          border-color: rgba(61, 214, 140, 0.35);
        }
        .linux-disclaimer {
          border-color: rgba(251, 191, 36, 0.4);
          background: rgba(251, 191, 36, 0.06);
          margin-bottom: 16px;
          font-size: 0.875rem;
        }
        .stealth-actions { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
        .settings-error { color: var(--color-error); }
      `}</style>
    </section>
  );
}
