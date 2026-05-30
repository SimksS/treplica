import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type {
  HistoryAssistantFilter,
  HistoryStatusFilter,
  SessionHistoryItemDto,
} from "../../lib/types";
import { HistorySessionCard } from "./HistorySessionCard";
import { HISTORY_ASSISTANT_FILTERS, HISTORY_FILTERS } from "./historyListUtils";
import "./session-history.css";

interface Props {
  onSelectSession: (sessionId: string) => void;
  initialQuery?: string;
}

export function SessionHistoryView({ onSelectSession, initialQuery = "" }: Props) {
  const [items, setItems] = useState<SessionHistoryItemDto[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [assistantFilter, setAssistantFilter] =
    useState<HistoryAssistantFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (
      search?: string,
      filter?: HistoryStatusFilter,
      assistant?: HistoryAssistantFilter,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const list = unwrap(
          await api.listSessionHistory(
            search || undefined,
            filter ?? statusFilter,
            assistant ?? assistantFilter,
          ),
        );
        setItems(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, assistantFilter],
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(query || undefined, statusFilter, assistantFilter);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, statusFilter, assistantFilter, load, initialQuery]);

  const handleRename = async (sessionId: string, title: string) => {
    const updated = unwrap(await api.renameSession(sessionId, title));
    setItems((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)),
    );
  };

  return (
    <section className="session-history-view" data-testid="session-history-view">
      <header className="session-history-header">
        <h2>Histórico</h2>
        <p className="session-history-subtitle">
          Busque pelo nome, filtre por status ou tipo de assistente e renomeie
          gravações para encontrá-las depois.
        </p>
      </header>

      <div className="history-toolbar">
        <input
          type="search"
          placeholder="Buscar por nome da gravação…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="history-search"
          aria-label="Buscar sessões"
        />
      </div>

      <div className="history-filters-row" data-testid="history-status-filters">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={
              statusFilter === f.id
                ? "history-status-filter active"
                : "history-status-filter"
            }
            data-testid={`history-filter-${f.id}`}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className="history-filters-row history-assistant-filters"
        data-testid="history-assistant-filters"
      >
        {HISTORY_ASSISTANT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={
              assistantFilter === f.id
                ? "history-status-filter active"
                : "history-status-filter"
            }
            data-testid={`history-assistant-filter-${f.id}`}
            onClick={() => setAssistantFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="history-error" data-testid="history-error" role="alert">
          {error}
        </p>
      )}

      {!loading && items.length > 0 && (
        <p className="history-results-count" data-testid="history-results-count">
          {items.length} {items.length === 1 ? "sessão" : "sessões"}
          {query.trim() ? ` para “${query.trim()}”` : ""}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="history-empty" data-testid="history-loading">
          Carregando…
        </p>
      ) : items.length === 0 ? (
        <p className="history-empty" data-testid="history-empty">
          {query.trim() || statusFilter !== "all" || assistantFilter !== "all"
            ? "Nenhuma sessão corresponde aos filtros."
            : "Nenhuma sessão no histórico."}
        </p>
      ) : (
        <ul className="history-list">
          {items.map((s) => (
            <li key={s.id}>
              <HistorySessionCard
                item={s}
                onOpen={() => onSelectSession(s.id)}
                onRename={handleRename}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
