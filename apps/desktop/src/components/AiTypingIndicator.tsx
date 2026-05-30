interface Props {
  /** Screen-reader label; visual UI is the animated bubble only. */
  label?: string;
  testId?: string;
}

function AssistantAvatar() {
  return (
    <div className="ai-chat-avatar" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
          d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M5 17.5l.9 2.1 2.1.9-2.1.9L5 23l-.9-2.1-2.1-.9 2.1-.9L5 17.5z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M19 15.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6z"
          fill="currentColor"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

export function AiTypingIndicator({
  label = "A IA está respondendo",
  testId = "ai-typing-indicator",
}: Props) {
  return (
    <div className="ai-chat-typing" data-testid={testId} role="status" aria-live="polite">
      <AssistantAvatar />
      <div className="ai-chat-bubble" aria-hidden="true">
        <span className="ai-chat-dot" />
        <span className="ai-chat-dot" />
        <span className="ai-chat-dot" />
      </div>
      <span className="ai-chat-sr-only">{label}</span>
      <style>{`
        .ai-chat-typing {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: var(--space-md);
          animation: ai-chat-fade-in 0.25s ease-out;
        }
        .ai-chat-avatar {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #22d3ee 100%);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .ai-chat-bubble {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 44px;
          padding: 12px 16px;
          border-radius: 20px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border-subtle);
          box-shadow: var(--shadow-card);
        }
        .ai-chat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-text-muted);
          animation: ai-chat-dot-wave 1.25s ease-in-out infinite;
        }
        .ai-chat-dot:nth-child(1) { animation-delay: 0ms; }
        .ai-chat-dot:nth-child(2) { animation-delay: 160ms; }
        .ai-chat-dot:nth-child(3) { animation-delay: 320ms; }
        .ai-chat-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @keyframes ai-chat-dot-wave {
          0%, 60%, 100% {
            transform: translateY(0) scale(0.82);
            opacity: 0.35;
          }
          30% {
            transform: translateY(-5px) scale(1);
            opacity: 1;
          }
        }
        @keyframes ai-chat-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
