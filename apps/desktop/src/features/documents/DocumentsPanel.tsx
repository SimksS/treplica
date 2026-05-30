import { useState } from "react";
import { MarkdownText } from "../../components/MarkdownText";
import type { GeneratedDocumentDto } from "../../lib/types";

interface Props {
  documents: GeneratedDocumentDto[];
  loading?: boolean;
  onGenerate: (docType: string) => void;
  onExport: (documentId: string) => void;
  onCopy: (content: string) => void;
  onDelete: (documentId: string) => void;
}

const DOC_TYPES = [
  { id: "summary", label: "Resumo" },
  { id: "follow_up_email", label: "Follow-up" },
  { id: "transcript_export", label: "Transcrição" },
  { id: "notes", label: "Notas" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  summary: "Resumo",
  follow_up_email: "Follow-up",
  transcript_export: "Transcrição",
  notes: "Notas",
};

interface ItemProps {
  doc: GeneratedDocumentDto;
  onCopy: (content: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

function DocumentItem({ doc, onCopy, onExport, onDelete }: ItemProps) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(doc.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="document-item" data-testid="document-item">
      <div className="document-meta">
        <span className="document-type" data-testid="document-type">
          {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
        </span>
        {doc.title && (
          <span className="document-title">{doc.title}</span>
        )}
        <span className="document-date">{date}</span>
      </div>

      <div className={`document-preview-wrap${expanded ? " document-preview-wrap--expanded" : ""}`}>
        <MarkdownText content={doc.content} className="document-rendered" />
        {!expanded && <div className="document-fade" aria-hidden="true" />}
      </div>

      <div className="document-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setExpanded((e) => !e)}
          data-testid="btn-toggle-document"
        >
          {expanded ? "Recolher" : "Ver tudo"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onCopy(doc.content)}
          data-testid="btn-copy-document"
        >
          Copiar
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onExport(doc.id)}
          data-testid="btn-export-document"
        >
          Exportar
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onDelete(doc.id)}
          data-testid="btn-delete-document"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}

export function DocumentsPanel({
  documents,
  loading,
  onGenerate,
  onExport,
  onCopy,
  onDelete,
}: Props) {
  return (
    <section className="panel" data-testid="documents-panel">
      <h2 className="panel-title">Documentos</h2>
      <div className="doc-generate-row">
        {DOC_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={() => onGenerate(t.id)}
            data-testid={`btn-generate-${t.id}`}
          >
            Gerar {t.label}
          </button>
        ))}
      </div>

      {documents.length === 0 ? (
        <p className="empty-state" data-testid="documents-empty">
          Nenhum documento gerado ainda.
        </p>
      ) : (
        <ul className="documents-list">
          {documents.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              onCopy={onCopy}
              onExport={onExport}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      <style>{`
        .doc-generate-row {
          display: flex; flex-wrap: wrap; gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        .empty-state { color: var(--color-text-muted); font-size: 0.875rem; margin: 0; }
        .documents-list {
          list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: var(--space-md);
        }
        .document-item {
          padding: var(--space-sm);
          background: var(--color-surface-elevated);
          border-radius: var(--radius-sm);
        }
        .document-meta {
          display: flex; flex-wrap: wrap; align-items: center;
          gap: var(--space-sm); font-size: 0.75rem;
          color: var(--color-text-muted); margin-bottom: var(--space-sm);
        }
        .document-type { color: var(--color-accent); font-weight: 600; }
        .document-title {
          flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .document-date { white-space: nowrap; margin-left: auto; }

        .document-preview-wrap {
          position: relative; max-height: 130px; overflow: hidden;
          margin-bottom: var(--space-sm);
        }
        .document-preview-wrap--expanded {
          max-height: 520px; overflow: auto; padding-right: 2px;
        }
        .document-fade {
          position: absolute; bottom: 0; left: 0; right: 0; height: 56px;
          pointer-events: none;
          background: linear-gradient(transparent, var(--color-surface-elevated));
        }

        .document-rendered { font-size: 0.8125rem; line-height: 1.55; color: var(--color-text); }
        .document-rendered .md-h1 { font-size: 1.0625rem; font-weight: 700; margin: 0 0 0.5em; color: var(--color-text); }
        .document-rendered .md-h2 { font-size: 0.9375rem; font-weight: 600; margin: 0.9em 0 0.35em; color: var(--color-text); }
        .document-rendered .md-h3 { font-size: 0.875rem; font-weight: 600; margin: 0.7em 0 0.3em; color: var(--color-text-muted); }
        .document-rendered .md-p { margin: 0 0 0.6em; }
        .document-rendered .md-p:last-child { margin-bottom: 0; }
        .document-rendered .md-ul,
        .document-rendered .md-ol { margin: 0 0 0.6em; padding-left: 1.4em; }
        .document-rendered .md-ul li,
        .document-rendered .md-ol li { margin-bottom: 0.2em; }

        .document-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
      `}</style>
    </section>
  );
}
