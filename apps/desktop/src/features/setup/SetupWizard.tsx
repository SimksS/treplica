import { useCallback, useEffect, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import type { OnboardingStateDto } from "../../lib/types";
import {
  CANONICAL_RECORD_HOTKEY,
  formatSendShortcut,
  prefetchRuntimePlatform,
  setupScreenPermissionCopy,
} from "../../lib/platform";
import { useRuntimePlatform } from "../../hooks/useRuntimePlatform";
import {
  resolveSpeechLang,
  speechRecognitionSupported,
  useSpeechRecognition,
} from "../../hooks/useSpeechRecognition";
import { useMicrophonePermission } from "../../hooks/useMicrophoneStream";
import { IconMic, IconScreen } from "../../components/layout/Icons";
import { SetupProvidersStep } from "./SetupProvidersStep";
import { SetupTestModal } from "./SetupTestModal";
import "./setup.css";

const STEP_COUNT = 6;

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const platform = useRuntimePlatform();
  const screenCopy = setupScreenPermissionCopy(platform);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingStateDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [testToast, setTestToast] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const [testModalOpen, setTestModalOpen] = useState(false);

  useEffect(() => {
    prefetchRuntimePlatform();
  }, []);

  useEffect(() => {
    if (!testToast) return;
    const id = window.setTimeout(() => setTestToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [testToast]);

  const mic = useMicrophonePermission();

  const langMode = state?.transcription_language_mode ?? "auto";
  const speechLang = resolveSpeechLang(
    langMode,
    state?.transcription_language_custom,
  );

  const speech = useSpeechRecognition(speechLang, {
    displayMode: "accumulated",
  });

  const persist = useCallback(
    async (patch: Parameters<typeof api.updateOnboardingState>[0]) => {
      const updated = unwrap(await api.updateOnboardingState(patch));
      setState(updated);
      return updated;
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      try {
        setState(unwrap(await api.getOnboardingState()));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const resetTestSession = useCallback(() => {
    speech.reset();
    setAiResponse(null);
    setError(null);
    setTestToast(null);
  }, [speech]);

  const closeTestModal = useCallback(() => {
    if (speech.listening) speech.stop();
    resetTestSession();
    setTestModalOpen(false);
  }, [speech, resetTestSession]);

  useEffect(() => {
    if (step === 5) return;
    setTestModalOpen(false);
    if (speech.listening) speech.stop();
    speech.reset();
    setAiResponse(null);
    setError(null);
    setTestToast(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when leaving the test step
  }, [step]);

  const hotkey = state?.send_transcript_hotkey ?? "Ctrl+Shift+O";
  const sendLabel = formatSendShortcut(hotkey, platform);
  const recordLabel = formatSendShortcut(CANONICAL_RECORD_HOTKEY, platform);

  const handleToggleRecording = useCallback(async () => {
    if (processing) return;

    if (speech.listening) {
      speech.stop();
      const text = speech.displayText.trim();
      if (!text) {
        setError("Nenhuma fala detectada. Tente novamente.");
        return;
      }
      setProcessing(true);
      setError(null);
      setAiResponse(null);
      setTestToast(null);
      try {
        const hint =
          langMode === "custom"
            ? state?.transcription_language_custom ?? undefined
            : langMode !== "auto"
              ? langMode
              : undefined;
        const result = unwrap(await api.runSetupAiTest(text, hint ?? null));
        setAiResponse(result.response_text);
        setTestToast({ kind: "success", message: "Resposta recebida da IA." });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setTestToast({ kind: "error", message });
      } finally {
        setProcessing(false);
      }
    } else {
      setAiResponse(null);
      setError(null);
      setTestToast(null);
      if (mic.status !== "granted") {
        const ok = await mic.request();
        if (!ok) return;
        await persist({ microphone_permission_granted: true });
      }
      if (!speech.supported) {
        setError(
          "Transcrição por voz indisponível. No app Tauri (WebView2) ela deve funcionar; reinicie com npm run tauri:dev.",
        );
        return;
      }
      speech.start();
    }
  }, [
    processing,
    speech,
    mic,
    persist,
    langMode,
    state?.transcription_language_custom,
  ]);

  const finish = async () => {
    setLoading(true);
    try {
      unwrap(await api.completeOnboarding());
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    setLoading(true);
    try {
      unwrap(await api.completeOnboarding());
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!state) {
    return (
      <div className="setup-shell" data-testid="setup-wizard-loading">
        <p className="setup-muted">Carregando configuração…</p>
      </div>
    );
  }

  return (
    <div className="setup-shell" data-testid="setup-wizard">
      <div className="setup-layout">
        <section className="setup-main">
          {step === 0 && (
            <div className="setup-step" data-testid="setup-step-welcome">
              <h1>Bem-vindo ao Treplica</h1>
              <p className="setup-lead">
                Assistente local-first para reuniões: transcrição, orientação e
                documentos no seu dispositivo.
              </p>
              <ul className="setup-checklist">
                <li>Permissões de microfone e tela</li>
                <li>Provedores (OpenAI, Groq, Ollama...)</li>
                <li>Testes e sessão por opção na tela principal</li>
              </ul>
            </div>
          )}

          {step === 1 && (
            <div className="setup-step" data-testid="setup-step-microphone">
              <h1>Acesso ao microfone</h1>
              <p className="setup-lead">
                O Treplica precisa ouvir sua voz para transcrever e gerar
                orientações. Nada é enviado sem o provedor de IA que você
                configurar.
              </p>
              <div className="setup-permission-card">
                <IconMic />
                <div>
                  <strong>Microfone</strong>
                  <p className="setup-muted">
                    {mic.status === "granted"
                      ? "Permissão concedida"
                      : "Clique para solicitar acesso do sistema"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    void (async () => {
                      const ok = await mic.request();
                      if (ok) await persist({ microphone_permission_granted: true });
                    })()
                  }
                  data-testid="btn-request-mic"
                >
                  {mic.status === "granted" ? "Conectado" : "Permitir microfone"}
                </button>
              </div>
              {mic.error && <p className="setup-error">{mic.error}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="setup-step" data-testid="setup-step-screen">
              <h1>Compartilhamento de tela</h1>
              <p className="setup-lead">{screenCopy.lead}</p>
              <div className="setup-permission-card">
                <IconScreen />
                <div>
                  <strong>Tela / áudio do sistema</strong>
                  <p className="setup-muted">{screenCopy.confirmHint}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void persist({ screen_permission_granted: true })}
                  data-testid="btn-confirm-screen"
                >
                  {state.screen_permission_granted ? "Confirmado" : "Já configurei"}
                </button>
              </div>
              <p className="setup-hint">{screenCopy.settingsHint}</p>
            </div>
          )}

          {step === 3 && (
            <div className="setup-step" data-testid="setup-step-session-note">
              <h1>Configuração por sessão</h1>
              <p className="setup-lead">
                O tipo de áudio, idioma de fala e destino são escolhidos quando
                você inicia uma nova sessão na tela principal. Assim você pode
                ajustar isso por reunião, sem travar uma configuração global.
              </p>
              <div className="setup-session-note">
                <strong>Onde configurar depois:</strong>
                <span>Tela principal → escolha da sessão → modal de configuração</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="setup-step" data-testid="setup-step-providers">
              <h1>Conecte seus provedores</h1>
              <p className="setup-lead">
                Configure aqui as APIs (OpenAI, Groq, etc.) ou modelos locais.
                Você pode pular e configurar depois em Configurações → Provedores.
              </p>
              <SetupProvidersStep />
            </div>
          )}

          {step === 5 && (
            <div className="setup-step setup-step-test" data-testid="setup-step-test">
              <h1>Teste sua configuração</h1>
              <p className="setup-lead">
                Opcional: grave uma pergunta e confira se a IA responde com os
                provedores que você configurou.
              </p>
              <p className="setup-success-line">
                Perfeito! Tudo está configurado.
              </p>
              <button
                type="button"
                className="btn-secondary setup-open-test-btn"
                onClick={() => setTestModalOpen(true)}
                data-testid="btn-open-setup-test"
              >
                Testar configuração
              </button>
              <p className="setup-hint setup-test-step-hint">
                No teste, use <kbd>{sendLabel}</kbd> ou <kbd>{recordLabel}</kbd> para
                gravar e enviar ({platform.displayName}).
              </p>
              {!speechRecognitionSupported() && (
                <p className="setup-hint">
                  Dica: execute com <code>npm run tauri:dev</code> para transcrição
                  real no WebView2.
                </p>
              )}
            </div>
          )}

          <footer className="setup-footer">
            <button
              type="button"
              className="btn-ghost"
              disabled={step === 0 || loading}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Voltar
            </button>
            <div className="setup-dots" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <span
                  key={i}
                  className={`setup-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                />
              ))}
            </div>
            <div className="setup-footer-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void skip()}
                disabled={loading}
              >
                Pular por enquanto
              </button>
              {step < STEP_COUNT - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={
                    (step === 1 && mic.status !== "granted") ||
                    (step === 2 && !state.screen_permission_granted)
                  }
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void finish()}
                  disabled={loading}
                  data-testid="btn-setup-finish"
                >
                  Começar
                </button>
              )}
            </div>
          </footer>
          {error && (
            <p className="setup-error setup-error-global" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      <SetupTestModal
        open={testModalOpen}
        onClose={closeTestModal}
        hotkey={hotkey}
        displayText={speech.displayText}
        listening={speech.listening}
        processing={processing}
        aiResponse={aiResponse}
        error={speech.error}
        toast={testToast}
        languageMode={langMode}
        languageCustom={state.transcription_language_custom ?? ""}
        onLanguageModeChange={(mode) =>
          void persist({
            transcription_language_mode: mode,
          })
        }
        onLanguageCustomChange={(text) =>
          void persist({ transcription_language_custom: text })
        }
        onToggleRecording={() => void handleToggleRecording()}
        onCancelRecording={resetTestSession}
      />
    </div>
  );
}
