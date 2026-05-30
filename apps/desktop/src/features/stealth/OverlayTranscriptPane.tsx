import { useEffect, useRef } from "react";
import type { TranscriptDto } from "../../lib/types";

interface Props {
  segments: TranscriptDto[];
  interimText?: string;
  emptyLabel?: string;
}

export function OverlayTranscriptPane({
  segments,
  interimText,
  emptyLabel = "Aguardando fala (microfone ou áudio do sistema)…",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [segments, interimText]);

  return (
    <section className="stealth-transcript-pane" data-testid="overlay-transcript-pane">
      <h3 className="stealth-pane-title">Transcrição</h3>
      <div className="stealth-transcript-scroll" ref={scrollRef}>
        {segments.length === 0 && !interimText ? (
          <p className="stealth-hint">{emptyLabel}</p>
        ) : (
          <ul className="stealth-transcript-list">
            {segments.map((seg) => (
              <li key={seg.id} className="stealth-transcript-item" data-testid="overlay-transcript-item">
                {seg.speaker_label && (
                  <span className="stealth-transcript-speaker">{seg.speaker_label}</span>
                )}
                <p className="stealth-transcript-text">{seg.text}</p>
              </li>
            ))}
          </ul>
        )}
        {interimText && (
          <p className="stealth-transcript-interim" data-testid="overlay-transcript-interim">
            {interimText}
          </p>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>
    </section>
  );
}
