import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect, useRef, useState } from "react";

import { EndSessionConfirmModal } from "../components/EndSessionConfirmModal";
import { QuitConfirmModal } from "../components/QuitConfirmModal";
import type { useLiveSession } from "../features/live-session/useLiveSession";
import { isActiveLiveSession } from "../features/live-session/liveSessionUtils";
import * as api from "../lib/tauriClient";
import { unwrap } from "../lib/tauriClient";

export type LeavePromptReason = "navigation" | "overlay-hide" | "app-close";

type LiveSession = ReturnType<typeof useLiveSession>;

const MESSAGES: Record<
  LeavePromptReason,
  { title: string; message: string; keepActiveLabel: string }
> = {
  navigation: {
    title: "Encerrar reunião?",
    message:
      "Há uma reunião em andamento. Se sair sem encerrar, ela continuará aparecendo como ativa no histórico.",
    keepActiveLabel: "Sair e manter ativa",
  },
  "overlay-hide": {
    title: "Encerrar reunião?",
    message:
      "A reunião ainda está em andamento. Deseja encerrá-la antes de fechar o overlay?",
    keepActiveLabel: "Fechar overlay e manter ativa",
  },
  "app-close": {
    title: "Encerrar reunião antes de sair?",
    message:
      "A reunião ainda está em andamento. Você pode encerrá-la agora ou manter em segundo plano e fechar a janela.",
    keepActiveLabel: "Fechar janela e manter ativa",
  },
};

export function useSessionLeavePrompt(live: LiveSession) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<LeavePromptReason>("navigation");
  const [ending, setEnding] = useState(false);
  const pendingAction = useRef<(() => void | Promise<void>) | null>(null);

  const needsPrompt = useCallback(() => {
    return isActiveLiveSession(live.sessionId, live.status);
  }, [live.sessionId, live.status]);

  const requestLeave = useCallback(
    (nextReason: LeavePromptReason, onProceed: () => void | Promise<void>) => {
      if (!needsPrompt()) {
        void onProceed();
        return;
      }
      pendingAction.current = onProceed;
      setReason(nextReason);
      setOpen(true);
    },
    [needsPrompt],
  );

  const closeModal = useCallback(() => {
    setOpen(false);
    pendingAction.current = null;
  }, []);

  const runPending = useCallback(async () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setOpen(false);
    if (action) await action();
  }, []);

  const handleConfirmEnd = useCallback(async () => {
    setEnding(true);
    try {
      await live.end();
      await runPending();
    } finally {
      setEnding(false);
    }
  }, [live, runPending]);

  const handleKeepActive = useCallback(() => {
    void runPending();
  }, [runPending]);

  const copy = MESSAGES[reason];

  const modal = (
    <EndSessionConfirmModal
      open={open}
      title={copy.title}
      message={copy.message}
      ending={ending}
      keepActiveLabel={copy.keepActiveLabel}
      onConfirmEnd={() => void handleConfirmEnd()}
      onKeepActive={handleKeepActive}
      onCancel={closeModal}
    />
  );

  return { requestLeave, needsPrompt, modal };
}

/** Exibe modal de confirmação quando o usuário fecha a janela sem sessão ativa. */
export function useQuitListener() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const label = getCurrentWebviewWindow().label;
    if (label !== "main") return;

    const unlisten = listen("main-quit-requested", () => {
      setOpen(true);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const handleQuit = useCallback(() => {
    setOpen(false);
    api.quitApp();
  }, []);

  const handleMinimize = useCallback(async () => {
    setOpen(false);
    const win = getCurrentWebviewWindow();
    await win.hide();
    await api.releaseAllAudioCapture("main");
  }, []);

  const modal = (
    <QuitConfirmModal
      open={open}
      onQuit={handleQuit}
      onMinimize={() => void handleMinimize()}
      onCancel={() => setOpen(false)}
    />
  );

  return { modal };
}

/** Reidrata sessão ativa do backend e escuta pedidos de fechamento (main / overlay). */
export function useSessionLifecycleListeners(
  live: LiveSession,
  requestLeave: (
    reason: LeavePromptReason,
    onProceed: () => void | Promise<void>,
  ) => void,
) {
  useEffect(() => {
    void live.hydrateFromActiveSession();
  }, [live.hydrateFromActiveSession]);

  useEffect(() => {
    const label = getCurrentWebviewWindow().label;

    if (label === "main") {
      const unlisten = listen("main-close-requested", () => {
        requestLeave("app-close", async () => {
          const win = getCurrentWebviewWindow();
          if (win.label === "main") {
            await win.hide();
          }
          await api.releaseAllAudioCapture("main");
        });
      });
      return () => {
        void unlisten.then((fn) => fn());
      };
    }

    if (label === "stealth") {
      const unlisten = listen("overlay-hide-requested", () => {
        requestLeave("overlay-hide", async () => {
          unwrap(await api.hideStealthOverlay());
        });
      });
      return () => {
        void unlisten.then((fn) => fn());
      };
    }

    return undefined;
  }, [requestLeave]);
}
