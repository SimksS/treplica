import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { AccessibilitySettingsDto } from "../../lib/types";

const FONT_SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.875, label: "Pequeno (87,5%)" },
  { value: 1.0, label: "Normal (100%)" },
  { value: 1.125, label: "Grande (112,5%)" },
  { value: 1.25, label: "Muito grande (125%)" },
];

function applyAccessibility(s: AccessibilitySettingsDto) {
  const root = document.documentElement;
  root.style.fontSize = `${s.font_scale * 100}%`;
  root.style.setProperty("--overlay-font-scale", String(s.overlay_font_scale));
  root.classList.toggle("high-contrast", s.high_contrast);
  root.classList.toggle("reduce-motion", s.reduce_motion);
}

export function AccessibilitySettingsView() {
  const [settings, setSettings] = useState<AccessibilitySettingsDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = unwrap(await api.getAccessibilitySettings());
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<AccessibilitySettingsDto>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = unwrap(await api.updateAccessibilitySettings(next));
      setSettings(saved);
      applyAccessibility(saved);
      setMessage("Preferências de acessibilidade salvas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <section data-testid="accessibility-settings-view">
        <p className="card-muted">Carregando…</p>
      </section>
    );
  }

  return (
    <section data-testid="accessibility-settings-view">
      <header className="settings-page-header">
        <h1>Acessibilidade</h1>
        <p>
          Ajuste o tamanho do texto, contraste e animações para tornar o
          Treplica mais confortável.
        </p>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="card-muted" style={{ marginBottom: 12 }}>
          {message}
        </p>
      )}

      {/* Font scale — app */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="card-label">Tamanho do texto — aplicativo</p>
        <p className="card-muted" style={{ marginBottom: 12 }}>
          Ajusta o tamanho de todo o texto nas telas do Treplica.
        </p>
        <div className="a11y-scale-grid">
          {FONT_SCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              className={`a11y-scale-btn${settings.font_scale === opt.value ? " active" : ""}`}
              onClick={() => void save({ font_scale: opt.value })}
            >
              <span className="a11y-scale-preview" style={{ fontSize: `${opt.value * 0.875}rem` }}>
                Aa
              </span>
              <span className="a11y-scale-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font scale — overlay */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="card-label">Tamanho do texto — overlay discreto</p>
        <p className="card-muted" style={{ marginBottom: 12 }}>
          Controla apenas o texto exibido no overlay de reunião (janela discreta).
          Independente do tamanho global.
        </p>
        <div className="a11y-scale-grid">
          {FONT_SCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              className={`a11y-scale-btn${settings.overlay_font_scale === opt.value ? " active" : ""}`}
              onClick={() => void save({ overlay_font_scale: opt.value })}
            >
              <span className="a11y-scale-preview" style={{ fontSize: `${opt.value * 0.875}rem` }}>
                Aa
              </span>
              <span className="a11y-scale-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="card">
        <p className="card-label" style={{ marginBottom: 12 }}>Opções de exibição</p>

        <label className="a11y-toggle-row">
          <span className="a11y-toggle-info">
            <strong>Alto contraste</strong>
            <span className="card-muted" style={{ display: "block", fontSize: "0.8125rem" }}>
              Aumenta o contraste de cores para melhorar a legibilidade em ambientes
              iluminados ou para usuários com baixa visão.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.high_contrast}
            disabled={saving}
            onChange={(e) => void save({ high_contrast: e.target.checked })}
          />
        </label>

        <div className="a11y-divider" />

        <label className="a11y-toggle-row">
          <span className="a11y-toggle-info">
            <strong>Reduzir animações</strong>
            <span className="card-muted" style={{ display: "block", fontSize: "0.8125rem" }}>
              Desativa transições e efeitos de movimento na interface. Recomendado
              para usuários sensíveis a movimento.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.reduce_motion}
            disabled={saving}
            onChange={(e) => void save({ reduce_motion: e.target.checked })}
          />
        </label>
      </div>

      <style>{`
        .a11y-scale-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        @media (max-width: 560px) {
          .a11y-scale-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .a11y-scale-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border-subtle);
          background: var(--color-bg);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .a11y-scale-btn:hover:not(:disabled) {
          border-color: var(--color-border);
          color: var(--color-text);
        }
        .a11y-scale-btn.active {
          border-color: var(--color-accent);
          background: var(--color-accent-muted);
          color: var(--color-text);
        }
        .a11y-scale-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .a11y-scale-preview {
          font-weight: 700;
          line-height: 1;
        }
        .a11y-scale-label {
          font-size: 0.6875rem;
          text-align: center;
          line-height: 1.3;
        }
        .a11y-toggle-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          cursor: pointer;
          padding: 4px 0;
        }
        .a11y-toggle-row input[type="checkbox"] {
          width: 36px;
          height: 20px;
          flex-shrink: 0;
          margin-top: 2px;
          accent-color: var(--color-accent);
          cursor: pointer;
        }
        .a11y-toggle-info {
          flex: 1;
          min-width: 0;
        }
        .a11y-divider {
          height: 1px;
          background: var(--color-border-subtle);
          margin: 14px 0;
        }
      `}</style>
    </section>
  );
}
