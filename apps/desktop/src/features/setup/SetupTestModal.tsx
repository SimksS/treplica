import { IconClose } from "../../components/layout/Icons";
import { TranscriptionTestPanel } from "./TranscriptionTestPanel";

interface PanelProps {
  hotkey: string;
  displayText: string;
  listening: boolean;
  processing: boolean;
  aiResponse: string | null;
  error: string | null;
  toast?: { kind: "success" | "error"; message: string } | null;
  languageMode: string;
  languageCustom: string;
  onLanguageModeChange: (mode: string) => void;
  onLanguageCustomChange: (text: string) => void;
  onToggleRecording: () => void;
  onCancelRecording: () => void;
}

interface Props extends PanelProps {
  open: boolean;
  onClose: () => void;
}

export function SetupTestModal({
  open,
  onClose,
  listening,
  processing,
  ...panelProps
}: Props) {
  if (!open) return null;

  const busy = listening || processing;

  return (
    <div
      className="modal-backdrop setup-test-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-test-modal-title"
      data-testid="setup-test-modal"
      onClick={(e) => {
        if (e.target !== e.currentTarget || busy) return;
        onClose();
      }}
    >
      <div className="setup-test-modal card">
        <header className="setup-test-modal-header">
          <h2 id="setup-test-modal-title" className="card-title">
            Testar configuração
          </h2>
          <button
            type="button"
            className="setup-test-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
            data-testid="btn-close-setup-test"
          >
            <IconClose />
          </button>
        </header>
        <TranscriptionTestPanel
          {...panelProps}
          listening={listening}
          processing={processing}
          showLanguageControls={false}
          onCancel={panelProps.onCancelRecording}
        />
      </div>
    </div>
  );
}
