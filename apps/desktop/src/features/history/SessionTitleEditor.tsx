import { useEffect, useRef, useState } from "react";

import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";

interface Props {
  sessionId: string;
  title: string;
  onRenamed: (title: string) => void;
}

export function SessionTitleEditor({ sessionId, title, onRenamed }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = async () => {
    const next = draft.trim();
    if (!next) {
      setError("O título não pode ficar vazio.");
      return;
    }
    if (next === title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = unwrap(await api.renameSession(sessionId, next));
      onRenamed(updated.title);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="session-title-editor" data-testid="session-title-editor">
        <input
          ref={inputRef}
          type="text"
          className="session-title-input"
          value={draft}
          maxLength={200}
          disabled={saving}
          data-testid="session-title-input"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") {
              setDraft(title);
              setEditing(false);
              setError(null);
            }
          }}
        />
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={saving}
          data-testid="session-title-save"
          onClick={() => void save()}
        >
          Salvar
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={saving}
          onClick={() => {
            setDraft(title);
            setEditing(false);
            setError(null);
          }}
        >
          Cancelar
        </button>
        {error && (
          <p className="session-title-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="session-title-row">
      <h2 className="detail-title">{title}</h2>
      <button
        type="button"
        className="btn-ghost btn-sm session-title-edit-btn"
        title="Renomear sessão"
        data-testid="session-title-edit-btn"
        onClick={() => setEditing(true)}
      >
        Renomear
      </button>
    </div>
  );
}
