import { ASSISTANT_PRESETS } from "../assistants/assistantPresets";
import type {
  HistoryAssistantFilter,
  HistoryStatusFilter,
  SessionHistoryItemDto,
} from "../../lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  listening: "Ao vivo",
  paused: "Pausada",
  reconnecting: "Reconectando",
  ended: "Encerrada",
  failed: "Falhou",
  deleted: "Excluída",
};

export const HISTORY_FILTERS: { id: HistoryStatusFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Em andamento" },
  { id: "ended", label: "Encerradas" },
  { id: "failed", label: "Com falha" },
];

export const HISTORY_ASSISTANT_FILTERS: {
  id: HistoryAssistantFilter;
  label: string;
}[] = [
  { id: "all", label: "Todos assistentes" },
  ...ASSISTANT_PRESETS.map((p) => ({ id: p.id, label: p.name })),
  { id: "unset", label: "Sem assistente" },
];

const ASSISTANT_LABELS = Object.fromEntries(
  ASSISTANT_PRESETS.map((p) => [p.id, p.name]),
) as Record<string, string>;

export function assistantPresetLabel(presetId?: string | null): string | null {
  if (!presetId?.trim()) return null;
  return ASSISTANT_LABELS[presetId] ?? presetId;
}

export function sessionStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function sessionDisplayDate(item: SessionHistoryItemDto): string {
  const iso = item.ended_at ?? item.started_at ?? null;
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function sessionStatsLine(item: SessionHistoryItemDto): string {
  const parts = [`${item.transcript_count} trechos`];
  if (item.suggestion_count > 0) {
    parts.push(`${item.suggestion_count} orientações`);
  }
  if (item.document_count > 0) {
    parts.push(`${item.document_count} docs`);
  }
  return parts.join(" · ");
}
