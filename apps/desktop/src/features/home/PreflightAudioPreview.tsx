interface Props {
  src: string | null;
  testId?: string;
  hint?: string;
}

export function PreflightAudioPreview({
  src,
  testId = "preflight-audio-preview",
  hint = "Ouça a gravação para confirmar que o áudio foi capturado.",
}: Props) {
  if (!src) return null;

  return (
    <div className="preflight-audio-preview" data-testid={testId}>
      <p className="preflight-audio-preview-label">{hint}</p>
      <audio controls src={src} preload="metadata" data-testid={`${testId}-player`} />
      <style>{`
        .preflight-audio-preview {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }
        .preflight-audio-preview-label {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--color-text-muted, #8b9cb3);
        }
        .preflight-audio-preview audio {
          width: 100%;
          height: 36px;
        }
      `}</style>
    </div>
  );
}
