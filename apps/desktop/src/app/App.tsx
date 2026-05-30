import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../lib/tauriClient";
import { unwrap } from "../lib/tauriClient";
import { TopBar, type MainNav } from "../components/layout/TopBar";
import {
  SettingsSidebar,
  type SettingsSection,
} from "../components/layout/SettingsSidebar";
import { HomeDashboard } from "../features/home/HomeDashboard";
import { LiveAssistantView } from "../features/live-session/LiveAssistantView";
import { SessionDetailView } from "../features/history/SessionDetailView";
import { SessionHistoryView } from "../features/history/SessionHistoryView";
import { ProviderSettingsView } from "../features/providers/ProviderSettingsView";
import { PrivacySettingsView } from "../features/settings/PrivacySettingsView";
import { StealthSettingsView } from "../features/settings/StealthSettingsView";
import { ModelRoutingSettingsView } from "../features/settings/ModelRoutingSettingsView";
import { DataStorageSettingsView } from "../features/settings/DataStorageSettingsView";
import { UpdateSettingsView } from "../features/settings/UpdateSettingsView";
import { AccessibilitySettingsView } from "../features/settings/AccessibilitySettingsView";
import { MicrophoneSettingsView } from "../features/settings/MicrophoneSettingsView";
import { AssistantConfigModal } from "../features/assistants/AssistantConfigModal";
import {
  StartMeetingModal,
  type StartMeetingPayload,
} from "../features/home/StartMeetingModal";
import { SetupWizard } from "../features/setup/SetupWizard";
import { MainMicrophoneBridge } from "../features/live-session/MainMicrophoneBridge";
import { useLiveSession } from "../features/live-session/useLiveSession";
import type { SessionContextForm } from "../features/live-session/SessionContextEditor";
import {
  formToSessionContextDto,
  formToUpdateInput,
  hasUpdateInput,
  preferencesToForm,
} from "../features/assistants/assistantContextUtils";
import type { SessionContextDto } from "../lib/types";
import {
  useSessionLeavePrompt,
  useSessionLifecycleListeners,
} from "../hooks/useSessionLeavePrompt";
import { prefetchRuntimePlatform } from "../lib/platform";
import type { AccessibilitySettingsDto } from "../lib/types";

function applyAccessibility(s: AccessibilitySettingsDto) {
  const root = document.documentElement;
  root.style.fontSize = `${s.font_scale * 100}%`;
  root.style.setProperty("--overlay-font-scale", String(s.overlay_font_scale));
  root.classList.toggle("high-contrast", s.high_contrast);
  root.classList.toggle("reduce-motion", s.reduce_motion);
}

type View =
  | "home"
  | "live"
  | "history"
  | "detail"
  | SettingsSection;

function resolveMainNav(view: View): MainNav {
  if (view.startsWith("settings-")) return "settings";
  if (view === "history" || view === "detail") return "history";
  if (view === "live") return "live";
  return "home";
}

export function App() {
  const [onboardingRequired, setOnboardingRequired] = useState<boolean | null>(
    null,
  );
  const [view, setView] = useState<View>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState<SessionContextForm | null>(null);
  const [assistantPrefs, setAssistantPrefs] = useState<SessionContextForm | null>(null);
  const [startMeetingOpen, setStartMeetingOpen] = useState(false);

  const live = useLiveSession();
  const leave = useSessionLeavePrompt(live);
  useSessionLifecycleListeners(live, leave.requestLeave);
  const isSettings = view.startsWith("settings-");

  const guardedNavigate = useCallback(
    (target: View) => {
      if (target === view) return;
      if (!leave.needsPrompt()) {
        setView(target);
        return;
      }
      // React state says session is active. Verify with backend before showing the modal —
      // the overlay may have ended the session but the event hasn't been processed yet.
      void (async () => {
        try {
          const snap = await api.getOverlaySessionSnapshot();
          if (!snap.session_id) {
            live.resetLiveSession();
            setView(target);
            return;
          }
        } catch {
          // ignore and fall through to the modal
        }
        leave.requestLeave("navigation", () => setView(target));
      })();
    },
    [view, leave.needsPrompt, leave.requestLeave, live.resetLiveSession],
  );

  useEffect(() => {
    prefetchRuntimePlatform();
    void (async () => {
      try {
        const s = unwrap(await api.getAccessibilitySettings());
        applyAccessibility(s);
      } catch {
        /* use browser defaults */
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const state = unwrap(await api.getOnboardingState());
        setOnboardingRequired(!state.completed);
      } catch {
        setOnboardingRequired(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const prefs = unwrap(await api.getAssistantPreferences());
        setAssistantPrefs(preferencesToForm(prefs));
      } catch {
        /* defaults from presets in modal */
      }
    })();
  }, []);

  const assistantModalContext = useMemo((): SessionContextDto | null => {
    if (live.context) return live.context;
    if (pendingContext) return formToSessionContextDto(pendingContext);
    if (assistantPrefs) return formToSessionContextDto(assistantPrefs);
    return null;
  }, [live.context, pendingContext, assistantPrefs]);

  const openAssistantConfig = useCallback(() => {
    void (async () => {
      if (live.sessionId) {
        await live.refreshContext();
      }
      setAssistantOpen(true);
    })();
  }, [live]);

  const applyContextToNewSession = useCallback(async () => {
    const form = pendingContext ?? assistantPrefs;
    if (!form) return;
    const input = formToUpdateInput(form);
    if (!hasUpdateInput(input)) return;
    await live.updateContext(input);
    setPendingContext(null);
  }, [pendingContext, assistantPrefs, live]);

  const startLiveSession = useCallback(
    async (initial?: api.UpdateSessionContextInput) => {
      if (!live.sessionId) {
        await live.createAndStart(
          initial && hasUpdateInput(initial) ? initial : undefined,
        );
        setPendingContext(null);
      } else if (pendingContext) {
        await applyContextToNewSession();
      }
      try {
        unwrap(await api.showStealthOverlay());
      } catch {
        guardedNavigate("live");
      }
    },
    [live, pendingContext, applyContextToNewSession, guardedNavigate],
  );

  const handleStartMeeting = useCallback(
    (payload: StartMeetingPayload) => {
      setStartMeetingOpen(false);
      void startLiveSession(payload.input);
    },
    [startLiveSession],
  );

  const openHistory = (query?: string) => {
    if (query) setHistoryQuery(query);
    setSelectedSessionId(null);
    guardedNavigate("history");
  };

  const handleAssistantSave = (form: SessionContextForm) => {
    const input = formToUpdateInput(form);
    setAssistantPrefs(form);
    if (live.sessionId) {
      void live.updateContext(input);
    } else {
      void api.saveAssistantPreferences(input).catch(() => {
        /* updateContext path not available */
      });
      setPendingContext(form);
    }
    setAssistantOpen(false);
  };

  const toggleSettings = () => {
    if (isSettings) {
      guardedNavigate("home");
    } else {
      guardedNavigate("settings-providers");
    }
  };

  if (onboardingRequired === null) {
    return (
      <div className="app-shell">
        <main className="app-main" style={{ padding: 24 }}>
          <p className="card-muted">Carregando…</p>
        </main>
      </div>
    );
  }

  if (onboardingRequired) {
    return (
      <div className="app-shell">
        <SetupWizard onComplete={() => setOnboardingRequired(false)} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => openHistory(searchInput)}
        onHome={() => guardedNavigate("home")}
        onHistory={() => openHistory()}
        onSettings={toggleSettings}
        activeNav={resolveMainNav(view)}
      />

      <main className="app-main">
        {isSettings ? (
          <div className="settings-layout">
            <SettingsSidebar
              active={view as SettingsSection}
              onNavigate={(s) => guardedNavigate(s)}
              onClose={() => guardedNavigate("home")}
            />
            <div className="settings-content">
              {view === "settings-providers" && <ProviderSettingsView />}
              {view === "settings-models" && <ModelRoutingSettingsView />}
              {view === "settings-privacy" && <PrivacySettingsView />}
              {view === "settings-storage" && <DataStorageSettingsView />}
              {view === "settings-stealth" && <StealthSettingsView />}
              {view === "settings-updates" && <UpdateSettingsView />}
              {view === "settings-accessibility" && <AccessibilitySettingsView />}
              {view === "settings-microphone" && <MicrophoneSettingsView />}
            </div>
          </div>
        ) : (
          <>
            {view === "home" && (
              <HomeDashboard
                searchQuery={searchInput}
                activePresetId={assistantPrefs?.assistant_preset_id}
                onAnalyzeConversation={() => setStartMeetingOpen(true)}
                onStartLive={() => setStartMeetingOpen(true)}
                onOpenHistory={openHistory}
                onOpenStealth={() => setView("settings-stealth")}
                onConfigureAssistant={() => openAssistantConfig()}
              />
            )}
            {view === "live" && (
              <LiveAssistantView
                session={live}
                onBack={() => guardedNavigate("home")}
                onConfigureAssistant={() => openAssistantConfig()}
                pendingContext={pendingContext}
                onPendingApplied={() => setPendingContext(null)}
              />
            )}
            {view === "history" && (
              <SessionHistoryView
                initialQuery={historyQuery}
                onSelectSession={(id) => {
                  setSelectedSessionId(id);
                  setView("detail");
                }}
              />
            )}
            {view === "detail" && selectedSessionId && (
              <SessionDetailView
                sessionId={selectedSessionId}
                onBack={() => guardedNavigate("history")}
                onDeleted={() => {
                  setSelectedSessionId(null);
                  guardedNavigate("history");
                }}
              />
            )}
          </>
        )}
      </main>

      {leave.modal}

      <StartMeetingModal
        open={startMeetingOpen}
        defaultPresetId={
          assistantPrefs?.assistant_preset_id?.trim() || "note-taker"
        }
        onClose={() => setStartMeetingOpen(false)}
        onStart={handleStartMeeting}
      />

      <AssistantConfigModal
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        context={assistantModalContext}
        disabled={live.loading || live.status === "ended"}
        onSave={handleAssistantSave}
      />

      <MainMicrophoneBridge />
    </div>
  );
}
