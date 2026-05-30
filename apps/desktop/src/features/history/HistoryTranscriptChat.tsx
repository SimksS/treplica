import { useMemo } from "react";

import type {
  HistoryTranscriptDto,
  HistoryTranslationDto,
} from "../../lib/types";
import {
  formatHistoryTime,
  isOwnVoice,
  languagePairLabel,
  speakerDisplayName,
} from "./sessionDetailUtils";

interface Props {
  transcripts: HistoryTranscriptDto[];
  translations: HistoryTranslationDto[];
}

export function HistoryTranscriptChat({ transcripts, translations }: Props) {
  const translationByTranscript = useMemo(() => {
    const map = new Map<string, HistoryTranslationDto>();
    for (const t of translations) {
      map.set(t.transcript_segment_id, t);
    }
    return map;
  }, [translations]);

  if (transcripts.length === 0) {
    return (
      <p className="history-empty" data-testid="history-transcript-empty">
        Nenhum trecho de transcrição nesta sessão.
      </p>
    );
  }

  return (
    <div className="history-chat" data-testid="history-transcript-chat">
      {transcripts.map((seg) => {
        const own = isOwnVoice(seg.speaker_label);
        const translation = translationByTranscript.get(seg.id);
        return (
          <article
            key={seg.id}
            className={`chat-row ${own ? "chat-row--own" : "chat-row--other"}`}
            data-testid="history-chat-message"
          >
            <div className={`chat-bubble ${own ? "chat-bubble--own" : "chat-bubble--other"}`}>
              <header className="chat-bubble-header">
                <span className="chat-speaker">
                  {speakerDisplayName(seg.speaker_label)}
                </span>
                <time className="chat-time" dateTime={seg.created_at}>
                  {formatHistoryTime(seg.created_at)}
                </time>
              </header>
              <p className="chat-text">{seg.text}</p>
              {seg.is_uncertain && (
                <span className="chat-badge chat-badge--warn">Incerto</span>
              )}
            </div>
            {translation && (
              <div
                className="chat-bubble chat-bubble--translation"
                data-testid="history-chat-translation"
              >
                <header className="chat-bubble-header">
                  <span className="chat-speaker chat-speaker--ai">
                    Tradução ·{" "}
                    {languagePairLabel(
                      translation.source_language,
                      translation.target_language,
                    )}
                  </span>
                </header>
                <p className="chat-text">{translation.text}</p>
                {translation.is_uncertain && (
                  <span className="chat-badge chat-badge--warn">
                    Tradução incerta
                  </span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
