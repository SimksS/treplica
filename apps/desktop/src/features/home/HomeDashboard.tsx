import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { SessionHistoryItemDto } from "../../lib/types";
import { IconEye, IconMessage, IconMic, IconScreen, IconSpark } from "../../components/layout/Icons";
import { ASSISTANT_PRESETS } from "../assistants/assistantPresets";
import {
  CANONICAL_GUIDANCE_HOTKEY,
  formatSendShortcut,
} from "../../lib/platform";
import { useRuntimePlatform } from "../../hooks/useRuntimePlatform";

interface Props {
  onAnalyzeConversation: () => void;
  onStartLive: () => void;
  onOpenHistory: (query?: string) => void;
  onOpenStealth: () => void;
  onConfigureAssistant: () => void;
  searchQuery: string;
  activePresetId?: string;
}

export function HomeDashboard({
  onAnalyzeConversation,
  onStartLive,
  onOpenHistory,
  onOpenStealth,
  onConfigureAssistant,
  searchQuery,
  activePresetId,
}: Props) {
  const platform = useRuntimePlatform();
  const [recent, setRecent] = useState<SessionHistoryItemDto[]>([]);
  const guidanceShortcut = formatSendShortcut(CANONICAL_GUIDANCE_HOTKEY, platform);
  const captureShortcut = formatSendShortcut("Ctrl+E", platform);
  const askShortcut = formatSendShortcut("Ctrl+Enter", platform);

  const activePreset = useMemo(() => {
    const id = activePresetId?.trim();
    if (id) {
      return ASSISTANT_PRESETS.find((p) => p.id === id) ?? ASSISTANT_PRESETS[0]!;
    }
    return ASSISTANT_PRESETS[0]!;
  }, [activePresetId]);

  const loadRecent = useCallback(async () => {
    try {
      const list = unwrap(await api.listSessionHistory(undefined));
      setRecent(list.slice(0, 3));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  return (
    <div className="dashboard-layout" data-testid="home-dashboard">
      <aside className="dashboard-sidebar">
        <div className="card">
          <p className="card-label">Assistente atual</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 className="card-title">{activePreset.name}</h3>
              <p className="card-muted">Orientação contextual para reuniões</p>
            </div>
            <span className="integrated-tag">Integrado</span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ marginTop: 12 }}
            onClick={onConfigureAssistant}
            data-testid="btn-change-assistant"
          >
            Trocar assistente
          </button>
        </div>

        <div className="card highlight-card" style={{ marginTop: 12 }}>
          <p className="card-label" style={{ color: "var(--color-accent)" }}>
            Memória local
          </p>
          <h3 className="card-title">Histórico Treplica</h3>
          <p className="card-muted">
            Busque sessões passadas, resumos e documentos gerados — tudo permanece no seu
            dispositivo.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => onOpenHistory(searchQuery || undefined)}
          >
            Ver histórico
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="card-label" style={{ margin: 0 }}>
              Sessões recentes
            </p>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "2px 8px", fontSize: "0.75rem" }}
              onClick={() => onOpenHistory()}
            >
              Todas →
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="card empty-state" data-testid="home-no-sessions">
              Nenhuma sessão ainda
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {recent.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="action-row"
                    style={{ padding: "7px 12px", fontSize: "0.8125rem" }}
                    onClick={() => onOpenHistory()}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                    <span className="status-badge status-ended" style={{ flexShrink: 0 }}>{s.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="dashboard-main">
        <div className="card">
          <h2 className="card-title" style={{ fontSize: "1.25rem" }}>
            Iniciar uma conversa
          </h2>
          <p className="card-muted" style={{ marginBottom: 20 }}>
            Escolha como quer começar sua sessão.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              className="action-row"
              onClick={onAnalyzeConversation}
              data-testid="btn-analyze-conversation"
            >
              <IconMic />
              <span>
                <strong>Analisar conversa</strong>
                <span className="card-muted" style={{ display: "block", marginTop: 2 }}>
                  Escolha o assistente e contexto antes de iniciar
                </span>
              </span>
              <kbd>{guidanceShortcut}</kbd>
            </button>
            <button type="button" className="action-row" onClick={onStartLive}>
              <IconScreen />
              <span>
                <strong>Capturar tela</strong>
                <span className="card-muted" style={{ display: "block", marginTop: 2 }}>
                  Em breve: captura integrada
                </span>
              </span>
              <kbd>{captureShortcut}</kbd>
            </button>
            <button type="button" className="action-row" onClick={onStartLive}>
              <IconMessage />
              <span>
                <strong>Perguntar algo</strong>
                <span className="card-muted" style={{ display: "block", marginTop: 2 }}>
                  Pedir orientação durante a sessão
                </span>
              </span>
              <kbd>{askShortcut}</kbd>
            </button>
          </div>
        </div>

        <div className="card stealth-card-available" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <IconEye />
            <div style={{ flex: 1 }}>
              <h3 className="card-title">Modo discreto (stealth)</h3>
              <p className="card-muted">
                Overlay que você vê no monitor, mas que não aparece em prints nem no
                compartilhamento de tela ({platform.displayName}). Atalho global disponível.
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}
                onClick={onOpenStealth}
                data-testid="btn-stealth-settings"
              >
                <IconSpark /> Configurar modo discreto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
