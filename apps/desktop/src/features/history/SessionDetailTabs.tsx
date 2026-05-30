import { useState } from "react";

import type { SessionDetailDto } from "../../lib/types";
import { DocumentsPanel } from "../documents/DocumentsPanel";
import { HistoryAuditTab } from "./HistoryAuditTab";
import { HistoryGuidanceTab } from "./HistoryGuidanceTab";
import { HistoryTranslationsTab } from "./HistoryTranslationsTab";
import { HistoryTranscriptChat } from "./HistoryTranscriptChat";
import { HistoryContextTab } from "./HistoryContextTab";
import "./session-detail.css";

export type SessionDetailTabId =
  | "transcript"
  | "context"
  | "guidance"
  | "translations"
  | "audit"
  | "documents";

interface Props {
  detail: SessionDetailDto;
  loading: boolean;
  onGenerate: (docType: string) => void;
  onExport: (documentId: string) => void;
  onCopy: (content: string) => void;
  onDeleteDoc: (documentId: string) => void;
}

const TABS: { id: SessionDetailTabId; label: (d: SessionDetailDto) => string }[] =
  [
    {
      id: "transcript",
      label: (d) => `Conversa (${d.transcripts.length})`,
    },
    {
      id: "context",
      label: () => "Contexto",
    },
    {
      id: "guidance",
      label: (d) => `Orientações (${d.suggestions.length})`,
    },
    {
      id: "translations",
      label: (d) => `Traduções (${d.translations.length})`,
    },
    {
      id: "audit",
      label: (d) =>
        `Auditoria (${d.audit_events.length + d.provider_calls.length})`,
    },
    {
      id: "documents",
      label: (d) => `Documentos (${d.documents.length})`,
    },
  ];

export function SessionDetailTabs({
  detail,
  loading,
  onGenerate,
  onExport,
  onCopy,
  onDeleteDoc,
}: Props) {
  const [activeTab, setActiveTab] = useState<SessionDetailTabId>("transcript");

  return (
    <div className="session-detail-tabs" data-testid="session-detail-tabs">
      <div
        className="session-detail-tablist"
        role="tablist"
        aria-label="Detalhes da sessão"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id
                ? "session-detail-tab active"
                : "session-detail-tab"
            }
            data-testid={`session-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label(detail)}
          </button>
        ))}
      </div>

      <div
        className="session-detail-tab-panel"
        role="tabpanel"
        data-testid={`session-tab-panel-${activeTab}`}
      >
        {activeTab === "transcript" && (
          <HistoryTranscriptChat
            transcripts={detail.transcripts}
            translations={detail.translations}
          />
        )}
        {activeTab === "context" && (
          <HistoryContextTab context={detail.context} />
        )}
        {activeTab === "guidance" && (
          <HistoryGuidanceTab suggestions={detail.suggestions} />
        )}
        {activeTab === "translations" && (
          <HistoryTranslationsTab translations={detail.translations} />
        )}
        {activeTab === "audit" && (
          <HistoryAuditTab
            auditEvents={detail.audit_events}
            providerCalls={detail.provider_calls}
          />
        )}
        {activeTab === "documents" && (
          <DocumentsPanel
            documents={detail.documents}
            loading={loading}
            onGenerate={onGenerate}
            onExport={onExport}
            onCopy={onCopy}
            onDelete={onDeleteDoc}
          />
        )}
      </div>
    </div>
  );
}
