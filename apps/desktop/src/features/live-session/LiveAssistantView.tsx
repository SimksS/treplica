import { useCallback, useEffect, useRef, useState } from "react";
import { useCloudTranscription } from "../../hooks/useCloudTranscription";
import { useGuidanceHotkey } from "../../hooks/useGuidanceHotkey";
import { speechRecognitionSupported } from "../../hooks/useSpeechRecognition";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import { formatSendShortcut } from "../../lib/platform";
import { useRuntimePlatform } from "../../hooks/useRuntimePlatform";
import { TranscriptStream } from "./TranscriptStream";
import { GuidancePanel } from "./GuidancePanel";
import { LiveSpeechSummary } from "./LiveSpeechSummary";
import { useLiveSpeechControls } from "../../hooks/useLiveSpeechControls";
import { TranslationPanel } from "./TranslationPanel";
import {
  isHostedAckRequiredError,
  SessionHostedAckBanner,
} from "./SessionHostedAckBanner";
import type { useLiveSession } from "./useLiveSession";
import type { SessionContextForm } from "./SessionContextEditor";

type LiveSession = ReturnType<typeof useLiveSession>;

interface Props {
  session: LiveSession;
  onBack: () => void;
  onConfigureAssistant: () => void;
  pendingContext?: SessionContextForm | null;
  onPendingApplied?: () => void;
}

export function LiveAssistantView({
  session,
  onBack,
  onConfigureAssistant,
  pendingContext,
  onPendingApplied,
}: Props) {
  const cloudStt = useCloudTranscription();
  const speech = useLiveSpeechControls(session);
  const platform = useRuntimePlatform();
  const [guidanceHotkey, setGuidanceHotkey] = useState("Ctrl+Shift+O");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelected = useCallback(
    (file: File | undefined) => {
      if (!file || !session.sessionId) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl === "string") {
          void session.analyzeImage(dataUrl, "upload");
        }
      };
      reader.onerror = () => {
        session.reportError("Não foi possível ler a imagem selecionada.");
      };
      reader.readAsDataURL(file);
    },
    [session],
  );

  const webSpeechOk = speechRecognitionSupported();
  const useWebSpeechFallback =
    cloudStt.loaded && !cloudStt.usable && webSpeechOk;
  const micUsesCloudStt = cloudStt.loaded && cloudStt.usable;


  useEffect(() => {
    void (async () => {
      try {
        const onboarding = unwrap(await api.getOnboardingState());
        const mode = onboarding.transcription_language_mode;
        if (mode === "auto") {
          speech.setSourceLanguage("auto");
        } else if (onboarding.transcription_language_custom) {
          speech.setSourceLanguage(
            onboarding.transcription_language_custom.split("-")[0] ?? mode,
          );
        } else {
          speech.setSourceLanguage(mode.split("-")[0] ?? "auto");
        }
        setGuidanceHotkey(onboarding.send_transcript_hotkey || "Ctrl+Shift+O");
      } catch {
        /* defaults */
      }
    })();
  }, []);

  useGuidanceHotkey(
    guidanceHotkey,
    () => void session.requestGuidance(),
    Boolean(session.sessionId) &&
      (session.status === "listening" || session.status === "paused"),
  );

  useEffect(() => {
    if (session.sessionId) {
      cloudStt.resetSuspension();
      void cloudStt.refresh();
    }
  }, [session.sessionId, cloudStt.refresh, cloudStt.resetSuspension]);

  useEffect(() => {
    if (!session.sessionId || !pendingContext) return;
    void (async () => {
      await session.updateContext({
        role: pendingContext.role || null,
        objective: pendingContext.objective || null,
        audience: pendingContext.audience || null,
        company_or_product_notes: pendingContext.company_or_product_notes || null,
        system_prompt: pendingContext.system_prompt || null,
        assistant_preset_id: pendingContext.assistant_preset_id || null,
        preferred_tone: pendingContext.preferred_tone || null,
        forbidden_topics: pendingContext.forbidden_topics || null,
      });
      onPendingApplied?.();
    })();
  }, [session.sessionId, pendingContext, session, onPendingApplied]);

  return (
    <div className="live-assistant" data-testid="live-assistant">
      <section className="panel live-overlay-hint" data-testid="live-overlay-hint">
        <p>
          A reunião ao vivo funciona pelo <strong>overlay</strong> (atalho{" "}
          <strong>Ctrl+Shift+H</strong>). Use o overlay para transcrição, tradução,
          orientação e snapshot — sem compartilhar tela para voz.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            void api.showStealthOverlay().catch(() => {
              session.reportError("Não foi possível abrir o overlay.");
            })
          }
        >
          Abrir overlay
        </button>
      </section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Início
        </button>
        <span
          className={`status-badge status-${session.status}`}
          data-testid="session-status"
        >
          {session.status}
        </span>
        <button type="button" className="btn-secondary" onClick={onConfigureAssistant}>
          Configurar assistente
        </button>
      </div>

      <section className="panel live-controls">
        <div className="live-controls-row">
          {session.sessionId && (
            <LiveSpeechSummary
              mode={speech.speechMode}
              sourceLanguage={speech.sourceLanguage}
              targetLanguage={session.targetLanguage}
            />
          )}
          <div className="live-actions">
            {!session.sessionId && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => void session.createAndStart()}
                disabled={session.loading}
                data-testid="btn-start"
              >
                Iniciar sessão
              </button>
            )}
            {session.sessionId && session.status === "listening" && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void session.pause()}
                data-testid="btn-pause"
              >
                Pausar
              </button>
            )}
            {session.sessionId && session.status === "paused" && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void session.resume()}
                data-testid="btn-resume"
              >
                Retomar
              </button>
            )}
            {session.sessionId &&
              (session.status === "listening" || session.status === "paused") && (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void session.simulateTick()}
                    disabled={session.aiBusy}
                    data-testid="btn-simulate"
                  >
                    {session.aiBusy ? "IA processando…" : "Simular fala"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void session.requestGuidance()}
                    disabled={session.guidanceTyping || session.visionTyping}
                    data-testid="btn-guidance"
                  >
                    {session.guidanceTyping ? "Gerando…" : "Pedir orientação"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={session.visionTyping}
                    data-testid="btn-upload-image"
                  >
                    {session.visionTyping ? "Analisando…" : "Enviar imagem"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    data-testid="input-session-image"
                    onChange={(e) => {
                      handleImageSelected(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void session.end()}
                    data-testid="btn-end"
                  >
                    Encerrar
                  </button>
                </>
              )}
          </div>
        </div>
        {session.sessionId && useWebSpeechFallback && (
          <p className="live-hint" data-testid="stt-fallback-banner">
            {cloudStt.suspendReason ? (
              <>
                {cloudStt.suspendReason} Alternativa ativa:{" "}
                <strong>Web Speech</strong> no microfone.
              </>
            ) : (
              <>
                Sem API de transcrição configurada — usando{" "}
                <strong>Web Speech</strong> no microfone. Para transcrição do
                áudio do computador, configure Groq ou OpenAI em Configurações →
                Provedores.
              </>
            )}
          </p>
        )}
        {session.sessionId &&
          cloudStt.loaded &&
          cloudStt.usable &&
          cloudStt.providerDisplayName && (
            <p className="live-hint" data-testid="stt-cloud-provider">
              Transcrição na nuvem: <strong>{cloudStt.providerDisplayName}</strong>
              {cloudStt.sttModel && (
                <>
                  {" "}
                  · modelo STT <strong>{cloudStt.sttModel}</strong>
                </>
              )}
              {cloudStt.sttModelIsFallback && cloudStt.connectionModel && (
                <>
                  {" "}
                  (a conexão usa <code>{cloudStt.connectionModel}</code> — Llama/GPT
                  não transcrevem áudio; usamos Whisper automaticamente)
                </>
              )}
              {micUsesCloudStt
                ? " · microfone + áudio do sistema via API (no overlay)"
                : " · microfone via Web Speech (no overlay)"}
            </p>
          )}
        {session.sessionId &&
          cloudStt.loaded &&
          !cloudStt.usable &&
          !webSpeechOk && (
            <p className="live-error" data-testid="stt-unavailable" role="alert">
              Nenhuma API de transcrição e Web Speech indisponível neste
              navegador. Configure um provedor STT ou use Chrome/Edge no app
              desktop.
            </p>
          )}
        <p className="live-hint" data-testid="live-shortcut-hint">
          Atalho <strong>{formatSendShortcut(guidanceHotkey, platform)}</strong> envia os últimos trechos da
          conversa (até 30) para a IA. Use <strong>Enviar imagem</strong> ou{" "}
          <strong>Snapshot</strong> no overlay para análise visual com o mesmo contexto.
        </p>
        {session.translationError && (
          <p className="live-error" data-testid="translation-error" role="alert">
            Tradução: {session.translationError}
          </p>
        )}
        {session.error &&
          session.sessionId &&
          isHostedAckRequiredError(session.error) && (
            <SessionHostedAckBanner
              sessionId={session.sessionId}
              onAcknowledged={() => session.clearError()}
            />
          )}
        {session.error && !isHostedAckRequiredError(session.error) && (
          <p className="live-error" data-testid="session-error" role="alert">
            {session.error}
          </p>
        )}
      </section>

      <div className="live-grid">
        <TranscriptStream
          segments={session.transcripts}
          totalCount={session.transcriptsTotal}
          interimText={session.interimTranscript}
        />
        <div className="live-side-column">
          <TranslationPanel
            translations={session.translations}
            enabled={speech.speechMode === "translation" && Boolean(session.targetLanguage)}
            isTyping={session.translationTyping}
          />
          <GuidancePanel
            suggestions={session.suggestions}
            isTyping={session.guidanceTyping || session.visionTyping}
            onCopy={(id) => void session.copySuggestion(id)}
            onSave={(id) => void session.saveSuggestion(id)}
          />
        </div>
      </div>
      <style>{`
        .live-assistant { display: flex; flex-direction: column; gap: var(--space-md); }
        .live-controls-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; }
        .live-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
        .live-hint { color: var(--color-text-dim); margin: var(--space-sm) 0 0; font-size: 0.8125rem; }
        .live-error { color: var(--color-error); margin: var(--space-sm) 0 0; font-size: 0.875rem; }
        .live-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
        .live-side-column { display: flex; flex-direction: column; gap: var(--space-md); }
        @media (max-width: 800px) { .live-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
