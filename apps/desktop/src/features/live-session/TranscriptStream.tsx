import type { TranscriptDto } from "../../lib/types";

interface Props {
  segments: TranscriptDto[];
  totalCount?: number;
  interimText?: string;
}

export function TranscriptStream({ segments, totalCount, interimText }: Props) {
  const hidden =
    totalCount !== undefined && totalCount > segments.length
      ? totalCount - segments.length
      : 0;

  return (
    <section className="panel" data-testid="transcript-stream">
      <h2 className="panel-title">Transcrição ao vivo</h2>
      {hidden > 0 && (
        <p className="transcript-truncated" data-testid="transcript-truncated">
          {hidden} trecho{hidden === 1 ? "" : "s"} anterior
          {hidden === 1 ? "" : "es"} no histórico da sessão (exibindo os mais recentes).
        </p>
      )}
      {segments.length === 0 && !interimText ? (
        <p className="empty-state" data-testid="transcript-empty">
          Aguardando fala no microfone ou áudio do sistema…
        </p>
      ) : (
        <ul className="transcript-list">
          {segments.map((seg) => (
            <li key={seg.id} className="transcript-item" data-testid="transcript-item">
              {seg.speaker_label && (
                <span className="transcript-speaker">{seg.speaker_label}</span>
              )}
              <p className="transcript-text">{seg.text}</p>
              {seg.is_uncertain && (
                <span className="confidence-low">Incerto</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {interimText && (
        <p className="transcript-interim" data-testid="transcript-interim">
          {interimText}
        </p>
      )}
      <style>{`
        .transcript-truncated { color: var(--color-text-muted); font-size: 0.75rem; margin: 0 0 var(--space-sm); }
        .empty-state { color: var(--color-text-muted); font-size: 0.875rem; margin: 0; }
        .transcript-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-sm); max-height: 320px; overflow-y: auto; }
        .transcript-item { padding: var(--space-sm); background: var(--color-surface-elevated); border-radius: var(--radius-sm); }
        .transcript-speaker { font-size: 0.75rem; color: var(--color-text-muted); display: block; margin-bottom: 2px; }
        .transcript-text { margin: 0; font-size: 0.875rem; }
        .transcript-interim { margin: var(--space-sm) 0 0; font-size: 0.875rem; color: var(--color-text-muted); font-style: italic; }
      `}</style>
    </section>
  );
}
