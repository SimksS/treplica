import { useEffect, useRef } from "react";

import type { TranscriptDto, TranslationDto } from "../../lib/types";

interface Props {
  translations: TranslationDto[];
  transcripts?: TranscriptDto[];
  interimText?: string;
  showOriginal?: boolean;
}

export function OverlayTranslationPane({
  translations,
  transcripts = [],
  interimText,
  showOriginal = true,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [translations, interimText]);

  return (
    <section
      className="stealth-translation-pane"
      data-testid="overlay-translation-pane"
    >
      <h3 className="stealth-pane-title">Tradução</h3>
      <div className="stealth-transcript-scroll">
        {translations.length === 0 && !interimText ? (
          <p className="stealth-hint">
            Traduções aparecem após cada pausa na fala, quando o modo tradução
            está ativo.
          </p>
        ) : (
          <ul className="stealth-transcript-list">
            {translations.map((t) => {
              const original = transcripts.find(
                (seg) => seg.id === t.transcript_segment_id,
              );
              return (
                <li
                  key={t.id}
                  className="stealth-transcript-item"
                  data-testid="overlay-translation-item"
                >
                  <span className="stealth-transcript-speaker">
                    {t.source_language} → {t.target_language}
                  </span>
                  {showOriginal && original && (
                    <p className="stealth-transcript-original">{original.text}</p>
                  )}
                  <p className="stealth-transcript-text">{t.text}</p>
                </li>
              );
            })}
          </ul>
        )}
        {interimText && (
          <p className="stealth-transcript-interim">{interimText}</p>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>
    </section>
  );
}
