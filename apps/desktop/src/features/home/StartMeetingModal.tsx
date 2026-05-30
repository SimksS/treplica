import { useCallback, useEffect, useRef, useState } from "react";
import { IconClose } from "../../components/layout/Icons";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { UpdateSessionContextInput } from "../../lib/tauriClient";
import {
  LiveSpeechSettings,
  isTranslationModeReady,
} from "../live-session/LiveSpeechSettings";
import { writeOverlaySpeechPrefs } from "../../lib/overlaySpeechPrefs";
import {
  ASSISTANT_PRESETS,
  type AssistantPreset,
} from "../assistants/assistantPresets";
import { buildMeetingStartInput } from "../assistants/assistantContextUtils";
import {
  prepareMeetingAttachment,
  type MeetingAttachmentKind,
} from "../../lib/meetingDocumentPrep";
import {
  SessionPreflightChecks,
  type SessionPreflightPanel,
  type SessionPreflightStatus,
} from "./SessionPreflightChecks";
import "./start-meeting-modal.css";

export interface StartMeetingPayload {
  input: UpdateSessionContextInput;
}

interface Props {
  open: boolean;
  defaultPresetId?: string;
  onClose: () => void;
  onStart: (payload: StartMeetingPayload) => void;
}

const STEP_META = [
  {
    id: "speech",
    title: "Áudio e idioma",
    lead: "Escolha transcrição ou tradução e os idiomas para esta sessão.",
  },
  {
    id: "preflight-mic",
    title: "Testar microfone (opcional)",
    lead: "Só necessário se você for falar. Para legendar um vídeo ou só o áudio do PC, use Continuar sem gravar.",
  },
  {
    id: "preflight-system",
    title: "Testar áudio do sistema",
    lead: "Grave o áudio do PC por 4 segundos e ouça a prévia (ou confirme captura nativa).",
  },
  {
    id: "preflight-screen",
    title: "Testar captura de tela",
    lead: "Escolha o monitor, toque em testar captura e confira a prévia abaixo.",
  },
  {
    id: "assistant",
    title: "Assistente",
    lead: "Selecione o tipo de IA que vai orientar você durante a reunião.",
  },
  {
    id: "context",
    title: "Contexto (opcional)",
    lead: "Anexe PDF ou imagem para a IA ver slides e diagramas ao pedir orientação (não só texto).",
  },
] as const;

const STEP_COUNT = STEP_META.length;
const PREFLIGHT_PANEL_BY_STEP: Record<number, SessionPreflightPanel> = {
  1: "mic",
  2: "system",
  3: "screen",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function StartMeetingModal({
  open,
  defaultPresetId,
  onClose,
  onStart,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [presetId, setPresetId] = useState(defaultPresetId ?? "note-taker");
  const [contextText, setContextText] = useState("");
  const [contextSource, setContextSource] = useState<string | null>(null);
  const [attachmentPages, setAttachmentPages] = useState<string[]>([]);
  const [attachmentKind, setAttachmentKind] = useState<MeetingAttachmentKind | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [speechMode, setSpeechMode] = useState<"transcription" | "translation">(
    () => {
      try {
        return (
          (localStorage.getItem("treplica_overlay_speech_mode") as
            | "transcription"
            | "translation"
            | null) ?? "transcription"
        );
      } catch {
        return "transcription";
      }
    },
  );
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    try {
      return localStorage.getItem("treplica_overlay_source_language") ?? "auto";
    } catch {
      return "auto";
    }
  });
  const [targetLanguage, setTargetLanguage] = useState(() => {
    try {
      return localStorage.getItem("treplica_overlay_target_language") ?? "";
    } catch {
      return "";
    }
  });
  const [preflight, setPreflight] = useState<SessionPreflightStatus>({
    micGranted: false,
    micVerified: false,
    systemAudioVerified: false,
    screenCaptureVerified: false,
    ready: false,
  });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPresetId(defaultPresetId ?? "note-taker");
    setContextText("");
    setContextSource(null);
    setAttachmentPages([]);
    setAttachmentKind(null);
    setParseError(null);
    setParsing(false);
    setSubmitting(false);
    setPreflight({
      micGranted: false,
      micVerified: false,
      systemAudioVerified: false,
      screenCaptureVerified: false,
      ready: false,
    });
    try {
      setSpeechMode(
        (localStorage.getItem("treplica_overlay_speech_mode") as
          | "transcription"
          | "translation"
          | null) ?? "transcription",
      );
      setSourceLanguage(
        localStorage.getItem("treplica_overlay_source_language") ?? "auto",
      );
      setTargetLanguage(
        localStorage.getItem("treplica_overlay_target_language") ?? "",
      );
    } catch {
      setSpeechMode("transcription");
      setSourceLanguage("auto");
      setTargetLanguage("");
    }
  }, [open, defaultPresetId]);

  useEffect(() => {
    if (!open) return;
    writeOverlaySpeechPrefs({
      mode: speechMode,
      sourceLanguage,
      targetLanguage,
    });
  }, [open, speechMode, sourceLanguage, targetLanguage]);

  const applyPreset = (preset: AssistantPreset) => {
    setPresetId(preset.id);
  };

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setParsing(true);
    try {
      const prepared = await prepareMeetingAttachment(file);
      setAttachmentPages(prepared.pageDataUrls);
      setAttachmentKind(prepared.kind);
      setContextSource(prepared.sourceLabel);

      let supplemental = prepared.supplementalText;
      if (prepared.kind === "pdf") {
        try {
          const buf = await file.arrayBuffer();
          const parsed = unwrap(
            await api.parseMeetingDocument({
              filename: file.name,
              text: null,
              content_base64: arrayBufferToBase64(buf),
            }),
          );
          if (parsed.text.trim()) supplemental = parsed.text.trim();
        } catch {
          /* optional text layer */
        }
      }
      setContextText(supplemental);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  }, []);

  const clearAttachment = useCallback(() => {
    setAttachmentPages([]);
    setAttachmentKind(null);
    setContextSource(null);
    setContextText("");
  }, []);

  const translationReady = isTranslationModeReady(speechMode, targetLanguage);
  const isLastStep = step === STEP_COUNT - 1;
  const stepMeta = STEP_META[step]!;

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return translationReady;
      case 1:
        return true;
      case 2:
        return preflight.systemAudioVerified;
      case 3:
        return preflight.screenCaptureVerified;
      default:
        return true;
    }
  })();

  const advanceBlockedReason = (() => {
    if (step === 0 && !translationReady) {
      return "Selecione o idioma de destino para tradução";
    }
    if (step === 2 && !preflight.systemAudioVerified) {
      return "Conclua o teste de áudio do sistema";
    }
    if (step === 3 && !preflight.screenCaptureVerified) {
      return "Conclua o teste de captura de tela";
    }
    return undefined;
  })();

  const handleStart = () => {
    if (!preflight.ready || !translationReady) return;
    setSubmitting(true);
    const input = buildMeetingStartInput(presetId, {
      preMeetingContext: contextText.trim() || undefined,
      preMeetingContextSource: contextSource ?? undefined,
      preMeetingAttachmentPages:
        attachmentPages.length > 0 ? attachmentPages : undefined,
    });
    onStart({ input });
    setSubmitting(false);
  };

  const goNext = () => {
    if (!canAdvance) return;
    if (isLastStep) {
      handleStart();
      return;
    }
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  if (!open) return null;

  const activePreset =
    ASSISTANT_PRESETS.find((p) => p.id === presetId) ?? ASSISTANT_PRESETS[0]!;
  const preflightPanel = PREFLIGHT_PANEL_BY_STEP[step];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="start-meeting-modal-backdrop"
    >
      <div
        className="provider-modal start-meeting-modal"
        role="dialog"
        aria-modal
        aria-labelledby="start-meeting-title"
        data-testid="start-meeting-modal"
        data-step={stepMeta.id}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="provider-modal-header">
          <div>
            <h2 id="start-meeting-title" className="provider-modal-title">
              Iniciar reunião
            </h2>
            <p className="provider-modal-subtitle">
              Etapa {step + 1} de {STEP_COUNT}: {stepMeta.title}
            </p>
            <div
              className="start-meeting-steps-bar"
              aria-label={`Etapa ${step + 1} de ${STEP_COUNT}`}
            >
              {STEP_META.map((meta, i) => (
                <span
                  key={meta.id}
                  className={`start-meeting-step-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                  title={meta.title}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Fechar"
            onClick={onClose}
          >
            <IconClose />
          </button>
        </header>

        <div className="provider-modal-body">
          <div
            className="start-meeting-step"
            data-testid={`start-meeting-step-${stepMeta.id}`}
          >
            <h3>{stepMeta.title}</h3>
            <p className="start-meeting-step-lead">{stepMeta.lead}</p>

            <div className="start-meeting-step-content">
              {step === 0 && (
                <LiveSpeechSettings
                  compact
                  mode={speechMode}
                  sourceLanguage={sourceLanguage}
                  targetLanguage={targetLanguage}
                  onModeChange={(mode) => {
                    setSpeechMode(mode);
                    if (mode === "transcription") setTargetLanguage("");
                  }}
                  onSourceChange={setSourceLanguage}
                  onTargetChange={setTargetLanguage}
                />
              )}

              <div hidden={step < 1 || step > 3}>
                <SessionPreflightChecks
                  activePanel={preflightPanel ?? "mic"}
                  showHeader={false}
                  onStatusChange={setPreflight}
                />
              </div>

              {step === 4 && (
                <>
                  <div
                    className="start-meeting-preset-grid start-meeting-preset-grid--step"
                    data-testid="start-meeting-presets"
                  >
                    {ASSISTANT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={
                          preset.id === presetId
                            ? "start-meeting-preset active"
                            : "start-meeting-preset"
                        }
                        data-testid={`start-preset-${preset.id}`}
                        onClick={() => applyPreset(preset)}
                      >
                        <strong>{preset.name}</strong>
                        <span className="card-muted">{preset.subtitle}</span>
                      </button>
                    ))}
                  </div>
                  <p className="card-muted" style={{ marginTop: 8 }}>
                    Selecionado: <strong>{activePreset.name}</strong> —{" "}
                    {activePreset.form.objective}
                  </p>
                </>
              )}

              {step === 5 && (
                <section
                  className="start-meeting-context-step"
                  data-testid="pre-meeting-context-notice"
                >
                  <div className="start-meeting-file-row">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.md,.markdown,.txt,application/pdf,image/*,text/plain,text/markdown"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={parsing}
                      onClick={() => fileRef.current?.click()}
                      data-testid="btn-upload-context"
                    >
                      {parsing
                        ? "Preparando anexo…"
                        : "Anexar PDF ou imagem"}
                    </button>
                    {contextSource && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={clearAttachment}
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {contextSource && attachmentKind && (
                    <div
                      className="start-meeting-attachment-card"
                      data-testid="context-attachment-card"
                    >
                      <p className="card-muted" data-testid="context-source-label">
                        <strong>{contextSource}</strong>
                        {attachmentKind === "pdf" && attachmentPages.length > 0 && (
                          <>
                            {" "}
                            — {attachmentPages.length} página(s) para a IA
                            visualizar
                          </>
                        )}
                        {attachmentKind === "image" && " — imagem anexada"}
                      </p>
                      {attachmentPages.length > 0 && (
                        <div className="start-meeting-attachment-thumbs">
                          {attachmentPages.map((url, index) => (
                            <img
                              key={`${contextSource}-${index}`}
                              src={url}
                              alt={`Página ${index + 1} do anexo`}
                              className="start-meeting-attachment-thumb"
                            />
                          ))}
                        </div>
                      )}
                      <p className="card-muted start-meeting-attachment-hint">
                        Ao pedir orientação (atalho), o modelo de{" "}
                        <strong>visão</strong> configurado em Provedores recebe
                        essas páginas junto com a transcrição.
                      </p>
                    </div>
                  )}

                  <textarea
                    className="input-textarea"
                    rows={4}
                    placeholder="Notas em texto (opcional). Com PDF, usamos o texto extraído como complemento."
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    data-testid="pre-meeting-context-text"
                  />

                  {parseError && (
                    <p className="form-error" role="alert">
                      {parseError}
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>

        <footer className="start-meeting-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <div className="start-meeting-footer-nav">
            <button
              type="button"
              className="btn-ghost"
              disabled={step === 0}
              onClick={goBack}
              data-testid="btn-start-meeting-back"
            >
              Voltar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={
                submitting ||
                parsing ||
                !canAdvance ||
                (isLastStep && (!preflight.ready || !translationReady))
              }
              onClick={goNext}
              data-testid={
                isLastStep ? "btn-start-meeting-confirm" : "btn-start-meeting-next"
              }
              title={advanceBlockedReason}
            >
              {isLastStep ? "Iniciar sessão" : "Continuar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
