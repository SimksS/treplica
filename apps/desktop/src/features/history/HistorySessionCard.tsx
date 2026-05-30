import { useEffect, useRef, useState } from "react";

import type { SessionHistoryItemDto } from "../../lib/types";
import {
  assistantPresetLabel,
  sessionDisplayDate,
  sessionStatsLine,
  sessionStatusLabel,
} from "./historyListUtils";

interface Props {
  item: SessionHistoryItemDto;
  onOpen: () => void;
  onRename: (sessionId: string, title: string) => Promise<void>;
}

export function HistorySessionCard({ item, onOpen, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraftTitle(item.title);
    }
  }, [item.title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameError(null);
    setDraftTitle(item.title);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(item.title);
    setRenameError(null);
    setEditing(false);
  };

  const saveTitle = async () => {
    const next = draftTitle.trim();
    if (!next) {
      setRenameError("Digite um nome para a gravação.");
      return;
    }
    if (next === item.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setRenameError(null);
    try {
      await onRename(item.id, next);
      setEditing(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="history-card" data-testid="history-item">
      <div className="history-card-main">
        {editing ? (
          <div
            className="history-card-edit"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              className="history-card-title-input"
              value={draftTitle}
              maxLength={200}
              disabled={saving}
              data-testid="history-rename-input"
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveTitle();
                if (e.key === "Escape") cancelEdit();
              }}
            />
            <div className="history-card-edit-actions">
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={saving}
                data-testid="history-rename-save"
                onClick={() => void saveTitle()}
              >
                Salvar
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={saving}
                data-testid="history-rename-cancel"
                onClick={cancelEdit}
              >
                Cancelar
              </button>
            </div>
            {renameError && (
              <p className="history-card-edit-error" role="alert">
                {renameError}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="history-card-open"
            onClick={onOpen}
            data-testid="history-item-open"
          >
            <span className="history-card-title">{item.title}</span>
            <span className="history-card-meta">
              <span
                className={`history-status-badge history-status-badge--${item.status}`}
              >
                {sessionStatusLabel(item.status)}
              </span>
              {assistantPresetLabel(item.assistant_preset_id) && (
                <span className="history-assistant-badge">
                  {assistantPresetLabel(item.assistant_preset_id)}
                </span>
              )}
              {sessionDisplayDate(item) && (
                <time dateTime={item.ended_at ?? item.started_at ?? undefined}>
                  {sessionDisplayDate(item)}
                </time>
              )}
            </span>
            <span className="history-card-stats">{sessionStatsLine(item)}</span>
          </button>
        )}
      </div>
      {!editing && (
        <button
          type="button"
          className="history-card-rename"
          title="Renomear gravação"
          aria-label="Renomear gravação"
          data-testid="history-rename-btn"
          onClick={startEdit}
        >
          ✎
        </button>
      )}
    </article>
  );
}
