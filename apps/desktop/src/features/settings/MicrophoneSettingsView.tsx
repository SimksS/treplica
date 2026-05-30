import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../../lib/tauriClient";
import { unwrap } from "../../lib/tauriClient";
import { isTauriRuntime, useTauriListen } from "../../lib/tauriEvents";
import { useMacNativeSpeech } from "../../hooks/useMacNativeSpeech";
import type { MicrophoneDeviceDto, MicTestStatusDto } from "../../lib/types";

/** Sentinel value for the "OS default device" option in the <select>. */
const DEFAULT_OPTION = "__default__";

export function MicrophoneSettingsView() {
  const [supported, setSupported] = useState(true);
  const [devices, setDevices] = useState<MicrophoneDeviceDto[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testLevel, setTestLevel] = useState(0);
  const [peaked, setPeaked] = useState(false);

  const nativeSpeech = useMacNativeSpeech();
  const [nativeSpeechSaving, setNativeSpeechSaving] = useState(false);

  const toggleNativeSpeech = useCallback(
    async (next: boolean) => {
      setNativeSpeechSaving(true);
      setError(null);
      try {
        await nativeSpeech.setEnabled(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setNativeSpeechSaving(false);
      }
    },
    [nativeSpeech],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await api.nativeMicrophoneSupported();
      setSupported(ok);
      if (!ok) {
        setDevices([]);
        return;
      }
      const list = await api.listMicrophones();
      setDevices(list);
      const preferred = unwrap(await api.getPreferredMicrophone());
      setSelected(preferred ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stopTest = useCallback(async () => {
    setTesting(false);
    setTestLevel(0);
    if (!isTauriRuntime()) return;
    try {
      await api.stopMicrophoneTest();
    } catch {
      /* ignore */
    }
  }, []);

  const handleSelect = useCallback(
    async (value: string) => {
      const deviceName = value === DEFAULT_OPTION ? null : value;
      setSelected(deviceName);
      setSaved(false);
      setError(null);
      // A test in progress was bound to the previous device; stop it.
      if (testing) void stopTest();
      try {
        const stored = unwrap(await api.setPreferredMicrophone(deviceName));
        setSelected(stored ?? null);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [testing, stopTest],
  );

  const startTest = useCallback(async () => {
    setError(null);
    setPeaked(false);
    setTestLevel(0);
    setTesting(true);
    try {
      unwrap(await api.startMicrophoneTest(selected));
    } catch (e) {
      setTesting(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selected]);

  // Stop the test if the user leaves the screen.
  const stopTestRef = useRef(stopTest);
  stopTestRef.current = stopTest;
  useEffect(() => {
    return () => {
      void stopTestRef.current();
    };
  }, []);

  useTauriListen<MicTestStatusDto>(
    "microphone-test",
    (dto) => {
      if (dto.error) {
        setError(dto.error);
        setTesting(false);
        setTestLevel(0);
        return;
      }
      setTestLevel(dto.level);
      if (dto.level > 0.08) setPeaked(true);
      // Backend auto-stops after a few seconds; reflect that in the UI.
      if (!dto.active) {
        setTesting(false);
        setTestLevel(0);
      }
    },
    isTauriRuntime(),
  );

  // The stored device may no longer be connected; surface that so the user
  // knows capture is currently falling back to the OS default.
  const storedMissing =
    selected != null && !devices.some((d) => d.id === selected);

  const meterPct = Math.min(100, Math.round(testLevel * 140));

  return (
    <section data-testid="microphone-settings-view">
      <header className="settings-page-header">
        <h1>Microfone</h1>
        <p>
          Escolha qual microfone o Treplica usa para capturar sua voz nas
          sessões. A escolha vale para todas as sessões e tem efeito na próxima
          vez que a captura for iniciada.
        </p>
      </header>

      {!supported && (
        <div className="card" role="note" data-testid="mic-unsupported">
          <strong>Não disponível nesta plataforma</strong>
          <p style={{ marginTop: 6, marginBottom: 0 }}>
            A seleção nativa de microfone requer Windows ou macOS.
          </p>
        </div>
      )}

      {supported && (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <label htmlFor="mic-select" style={{ fontWeight: 600 }}>
            Microfone de captura
          </label>
          <select
            id="mic-select"
            data-testid="mic-select"
            value={selected ?? DEFAULT_OPTION}
            onChange={(e) => void handleSelect(e.target.value)}
            disabled={loading}
          >
            <option value={DEFAULT_OPTION}>
              Padrão do sistema
              {devices.find((d) => d.isDefault)
                ? ` (${devices.find((d) => d.isDefault)?.label})`
                : ""}
            </option>
            {storedMissing && selected && (
              <option value={selected}>
                Dispositivo selecionado (desconectado)
              </option>
            )}
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
                {d.isDefault ? " — padrão" : ""}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <button
              type="button"
              className={testing ? "btn-secondary" : "btn-primary"}
              onClick={() => void (testing ? stopTest() : startTest())}
              data-testid="btn-test-mic"
              disabled={loading || storedMissing}
            >
              {testing ? "Parar teste" : "Testar microfone"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void refresh()}
              data-testid="btn-refresh-mics"
              disabled={loading || testing}
            >
              {loading ? "Atualizando…" : "Atualizar lista"}
            </button>
          </div>

          {testing && (
            <div data-testid="mic-test-panel" style={{ display: "grid", gap: 6 }}>
              <div
                aria-hidden
                style={{
                  height: 12,
                  borderRadius: 6,
                  background: "var(--color-surface-2, rgba(255,255,255,0.08))",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${meterPct}%`,
                    background:
                      meterPct > 75
                        ? "var(--color-error, #ef4444)"
                        : "var(--color-success, #3dd68c)",
                    transition: "width 80ms linear",
                  }}
                />
              </div>
              <p className="card-muted" style={{ fontSize: "0.8125rem", margin: 0 }}>
                {peaked
                  ? "Sinal detectado — o microfone está captando. ✓"
                  : "Fale algo… a barra deve se mexer se o microfone certo foi escolhido."}
              </p>
            </div>
          )}

          {storedMissing && (
            <p className="card-muted" style={{ fontSize: "0.8125rem", margin: 0 }}>
              O microfone selecionado não está conectado no momento. A captura
              usará o padrão do sistema até que ele volte a ficar disponível.
            </p>
          )}

          {saved && !error && (
            <p
              className="card-muted"
              style={{ fontSize: "0.8125rem", margin: 0, color: "var(--color-success, #3dd68c)" }}
              role="status"
            >
              Preferência salva.
            </p>
          )}
        </div>
      )}

      {nativeSpeech.supported && (
        <div className="card" style={{ display: "grid", gap: 10 }} data-testid="native-speech-card">
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              data-testid="native-speech-toggle"
              checked={nativeSpeech.enabled}
              disabled={nativeSpeechSaving || !nativeSpeech.loaded}
              onChange={(e) => void toggleNativeSpeech(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span style={{ display: "grid", gap: 4 }}>
              <strong>Reconhecimento de fala nativo do macOS (offline)</strong>
              <span className="card-muted" style={{ fontSize: "0.8125rem" }}>
                Transcreve no dispositivo, sem provedor na nuvem nem chave de API.
                Útil porque o reconhecimento de voz do navegador não funciona no
                macOS. Como o reconhecedor da Apple não detecta o idioma sozinho,
                ele usa o idioma escolhido na transcrição (ou o do sistema, no
                modo "auto"). Qualidade pode ficar abaixo do Whisper na nuvem.
              </span>
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="settings-error" role="alert" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
