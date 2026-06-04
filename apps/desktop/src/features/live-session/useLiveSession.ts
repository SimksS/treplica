import { listen } from "@tauri-apps/api/event";

import { useCallback, useEffect, useMemo, useState } from "react";

import * as api from "../../lib/tauriClient";
import {
  formToUpdateInput,
  hasUpdateInput,
  preferencesToForm,
} from "../assistants/assistantContextUtils";

import { unwrap } from "../../lib/tauriClient";

import type { UpdateSessionContextInput } from "../../lib/tauriClient";

import type {

  AiActivityEventDto,

  AiActivityPurpose,

  GuidanceUpdateDto,

  LiveSessionStateDto,

  SessionContextDto,

  SessionStatus,

  SuggestionDto,

  TranscriptDto,

  TranscriptTickUpdateDto,

  TranslationDto,

} from "../../lib/types";



const LIVE_UI_MAX_TRANSCRIPTS = 100;

const LIVE_UI_MAX_TRANSLATIONS = 100;

const LIVE_UI_MAX_SUGGESTIONS = 50;



type AiPendingState = {
  guidance: number;
  translation: number;
  transcription: number;
  vision: number;
};



const EMPTY_AI_PENDING: AiPendingState = {
  guidance: 0,
  translation: 0,
  transcription: 0,
  vision: 0,
};



function trimWindow<T>(items: T[], max: number): T[] {

  if (items.length <= max) return items;

  return items.slice(items.length - max);

}



function appendUniqueById<T extends { id: string }>(prev: T[], item: T, max: number): T[] {

  if (prev.some((x) => x.id === item.id)) return prev;

  return trimWindow([...prev, item], max);

}



function bumpPending(prev: AiPendingState, purpose: AiActivityPurpose, delta: number): AiPendingState {

  const next = Math.max(0, prev[purpose] + delta);

  if (next === prev[purpose]) return prev;

  return { ...prev, [purpose]: next };

}



export function useLiveSession() {

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [status, setStatus] = useState<SessionStatus>("draft");

  const [context, setContext] = useState<SessionContextDto | null>(null);

  const [transcripts, setTranscripts] = useState<TranscriptDto[]>([]);

  const [translations, setTranslations] = useState<TranslationDto[]>([]);

  const [targetLanguage, setTargetLanguage] = useState("");

  const [suggestions, setSuggestions] = useState<SuggestionDto[]>([]);

  const [transcriptsTotal, setTranscriptsTotal] = useState(0);

  const [translationsTotal, setTranslationsTotal] = useState(0);

  const [suggestionsTotal, setSuggestionsTotal] = useState(0);

  const [loading, setLoading] = useState(false);

  const [aiPending, setAiPending] = useState<AiPendingState>(EMPTY_AI_PENDING);

  const [error, setError] = useState<string | null>(null);
  const [micInterim, setMicInterim] = useState("");
  const [systemInterim, setSystemInterim] = useState("");
  const [translationError, setTranslationError] = useState<string | null>(null);

  const interimTranscript = useMemo(() => {
    const parts = [micInterim, systemInterim].filter(Boolean);
    return parts.join(" · ");
  }, [micInterim, systemInterim]);



  const applyState = useCallback((state: LiveSessionStateDto) => {

    if (state.session) {

      setSessionId(state.session.id);

      setStatus(state.session.status);

      setTargetLanguage(state.session.target_language ?? "");

    }

    setContext(state.context ?? null);

    setTranscripts(state.transcripts);

    setTranslations(state.translations);

    setSuggestions(state.suggestions);

    setTranscriptsTotal(state.transcripts_total);

    setTranslationsTotal(state.translations_total);

    setSuggestionsTotal(state.suggestions_total);

  }, []);



  const applyTickUpdate = useCallback((update: TranscriptTickUpdateDto) => {

    setTranscripts((prev) =>

      appendUniqueById(prev, update.new_transcript, LIVE_UI_MAX_TRANSCRIPTS),

    );

    const speaker = update.new_transcript.speaker_label?.toLowerCase() ?? "";
    if (speaker.includes("sistema")) {
      setSystemInterim("");
    } else {
      setMicInterim("");
    }

    if (update.new_translation) {

      setTranslations((prev) =>

        appendUniqueById(prev, update.new_translation!, LIVE_UI_MAX_TRANSLATIONS),

      );

    }

    if (update.new_guidance) {

      setSuggestions((prev) =>

        appendUniqueById(

          prev,

          update.new_guidance!.new_suggestion,

          LIVE_UI_MAX_SUGGESTIONS,

        ),

      );

      setSuggestionsTotal(update.new_guidance.suggestions_total);

      setError(null);

    } else if (update.guidance_error) {

      setError(update.guidance_error);

    } else if (update.suggestions_total !== undefined) {

      setSuggestionsTotal(update.suggestions_total);

    }

    if (update.translation_error) {

      setTranslationError(update.translation_error);

    } else if (update.new_translation) {

      setTranslationError(null);

    }

    setTranscriptsTotal(update.transcripts_total);

    setTranslationsTotal(update.translations_total);

  }, []);



  const applyGuidanceUpdate = useCallback((update: GuidanceUpdateDto) => {

    setSuggestions((prev) =>

      appendUniqueById(prev, update.new_suggestion, LIVE_UI_MAX_SUGGESTIONS),

    );

    setSuggestionsTotal(update.suggestions_total);

    setError(null);

  }, []);



  const handleAiActivity = useCallback(

    (event: AiActivityEventDto, delta: number) => {

      if (!sessionId || event.sessionId !== sessionId) return;

      if (
        event.purpose !== "guidance" &&
        event.purpose !== "translation" &&
        event.purpose !== "transcription"
      ) {
        return;
      }

      setAiPending((prev) => bumpPending(prev, event.purpose, delta));

    },

    [sessionId],

  );



  useEffect(() => {

    if (!sessionId) return;



    const unlistenStarted = listen<AiActivityEventDto>("ai-activity-started", (event) => {

      handleAiActivity(event.payload, 1);

    });

    const unlistenFinished = listen<AiActivityEventDto>("ai-activity-finished", (event) => {

      handleAiActivity(event.payload, -1);

    });



    return () => {

      void unlistenStarted.then((fn) => fn());

      void unlistenFinished.then((fn) => fn());

    };

  }, [sessionId, handleAiActivity]);



  useEffect(() => {

    if (!sessionId || status !== "listening") return;



    const unlisten = listen<TranscriptTickUpdateDto>("live-transcript-tick", (event) => {

      applyTickUpdate(event.payload);

    });



    return () => {

      void unlisten.then((fn) => fn());

    };

  }, [sessionId, status, applyTickUpdate]);

  const resetLiveSession = useCallback(() => {
    setSessionId(null);
    setStatus("draft");
    setContext(null);
    setTranscripts([]);
    setTranslations([]);
    setSuggestions([]);
    setTranscriptsTotal(0);
    setTranslationsTotal(0);
    setSuggestionsTotal(0);
    setTargetLanguage("");
    setMicInterim("");
    setSystemInterim("");
    setTranslationError(null);
    setAiPending(EMPTY_AI_PENDING);
    setError(null);
  }, []);

  // Keep this window's live state in sync when another window (e.g. the overlay) ends the
  // session. Without this, the main window would still show the session as active and prompt
  // the user to end it again — creating a confusing double-entry in history.
  useEffect(() => {
    if (!sessionId) return;
    const unlisten = listen<string>("session-ended", (event) => {
      if (event.payload === sessionId) {
        resetLiveSession();
      }
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [sessionId, resetLiveSession]);

  const hydrateFromActiveSession = useCallback(async () => {
    try {
      const snap = await api.getOverlaySessionSnapshot();
      if (!snap.session_id) return false;
      const live = unwrap(await api.getLiveSessionState(snap.session_id));
      applyState(live);
      return true;
    } catch {
      return false;
    }
  }, [applyState]);

  const createAndStart = useCallback(
    async (initialContext?: api.UpdateSessionContextInput) => {
      setLoading(true);
      setError(null);
      try {
        const created = unwrap(await api.createSession("Reunião ao vivo"));
        let started;
        try {
          started = unwrap(await api.startSession(created.id));
        } catch (startErr) {
          // startSession failed — remove the orphaned draft so it doesn't appear in history.
          void api.deleteSession(created.id).catch(() => {});
          throw startErr;
        }
        setSessionId(started.id);
        setStatus(started.status);
        setTranscripts([]);
        setTranslations([]);
        setSuggestions([]);
        setMicInterim("");
        setSystemInterim("");
        setTranslationError(null);
        setAiPending(EMPTY_AI_PENDING);
        // Resolve o contexto a aplicar: o input explícito (fluxo do modal, com contexto
        // pré-reunião e anexos) tem prioridade; sem ele, recorremos às preferências do
        // assistente salvas, para que um assistente configurado seja SEMPRE aplicado.
        let contextToApply = initialContext;
        if (!contextToApply || !hasUpdateInput(contextToApply)) {
          try {
            const prefs = unwrap(await api.getAssistantPreferences());
            const fromPrefs = formToUpdateInput(preferencesToForm(prefs));
            if (hasUpdateInput(fromPrefs)) contextToApply = fromPrefs;
          } catch {
            /* sem preferências salvas — inicia sem contexto */
          }
        }
        const live =
          contextToApply && hasUpdateInput(contextToApply)
            ? unwrap(await api.updateSessionContext(started.id, contextToApply))
            : unwrap(await api.getLiveSessionState(started.id));
        applyState(live);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [applyState],
  );

  const refreshContext = useCallback(async () => {
    if (!sessionId) return;
    try {
      const ctx = unwrap(await api.getSessionContext(sessionId));
      setContext(ctx);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [sessionId]);



  const refresh = useCallback(

    async (id: string) => {

      const live = unwrap(await api.getLiveSessionState(id));

      applyState(live);

    },

    [applyState],

  );



  const pause = useCallback(async () => {

    if (!sessionId) return;

    setLoading(true);

    setError(null);

    try {

      const s = unwrap(await api.pauseSession(sessionId));

      setStatus(s.status);

    } catch (e) {

      setError(e instanceof Error ? e.message : String(e));

    } finally {

      setLoading(false);

    }

  }, [sessionId]);



  const resume = useCallback(async () => {

    if (!sessionId) return;

    setLoading(true);

    setError(null);

    try {

      const s = unwrap(await api.resumeSession(sessionId));

      setStatus(s.status);

    } catch (e) {

      setError(e instanceof Error ? e.message : String(e));

    } finally {

      setLoading(false);

    }

  }, [sessionId]);



  const end = useCallback(async () => {

    if (!sessionId) return;

    setLoading(true);

    setError(null);

    try {

      unwrap(await api.endSession(sessionId));
      resetLiveSession();
    } catch (e) {

      setError(e instanceof Error ? e.message : String(e));

    } finally {

      setLoading(false);

    }

  }, [sessionId, resetLiveSession]);



  const simulateTick = useCallback(async () => {

    if (!sessionId) return;

    setError(null);

    try {

      const update = unwrap(await api.simulateTranscriptTick(sessionId));

      applyTickUpdate(update);

    } catch (e) {

      setError(e instanceof Error ? e.message : String(e));

    }

  }, [sessionId, applyTickUpdate]);



  const requestGuidance = useCallback(async (): Promise<GuidanceUpdateDto | null> => {
    if (!sessionId) return null;

    setError(null);

    try {
      const update = unwrap(await api.requestContextualGuidance(sessionId));
      applyGuidanceUpdate(update);
      return update;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [sessionId, applyGuidanceUpdate]);

  const analyzeImage = useCallback(
    async (
      imageDataUrl: string,
      source = "upload",
    ): Promise<GuidanceUpdateDto | null> => {
      if (!sessionId) return null;
      setError(null);
      try {
        const update = unwrap(
          await api.analyzeSessionImage(sessionId, imageDataUrl, source),
        );
        applyGuidanceUpdate(update);
        return update;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [sessionId, applyGuidanceUpdate],
  );

  const clearMicInterim = useCallback(() => setMicInterim(""), []);
  const clearSystemInterim = useCallback(() => setSystemInterim(""), []);
  const clearInterim = useCallback(() => {
    setMicInterim("");
    setSystemInterim("");
  }, []);

  const updateContext = useCallback(

    async (input: UpdateSessionContextInput) => {

      if (!sessionId) return;

      setLoading(true);

      setError(null);

      try {

        const live = unwrap(await api.updateSessionContext(sessionId, input));

        applyState(live);

      } catch (e) {

        setError(e instanceof Error ? e.message : String(e));

      } finally {

        setLoading(false);

      }

    },

    [sessionId, applyState],

  );



  const setTargetLanguageForSession = useCallback(

    async (language: string) => {

      if (!sessionId) return;

      setLoading(true);

      setError(null);

      try {

        const live = unwrap(

          await api.setSessionTargetLanguage(sessionId, language),

        );

        applyState(live);

      } catch (e) {

        setError(e instanceof Error ? e.message : String(e));

      } finally {

        setLoading(false);

      }

    },

    [sessionId, applyState],

  );



  const copySuggestion = useCallback(

    async (suggestionId: string) => {

      if (!sessionId) return;

      setError(null);

      try {

        unwrap(await api.copySuggestion(sessionId, suggestionId));

        const s = suggestions.find((x) => x.id === suggestionId);

        if (s) await navigator.clipboard.writeText(s.text);

        await refresh(sessionId);

      } catch (e) {

        setError(e instanceof Error ? e.message : String(e));

      }

    },

    [sessionId, suggestions, refresh],

  );



  const saveSuggestion = useCallback(

    async (suggestionId: string) => {

      if (!sessionId) return;

      setError(null);

      try {

        unwrap(await api.saveSuggestion(sessionId, suggestionId));

        await refresh(sessionId);

      } catch (e) {

        setError(e instanceof Error ? e.message : String(e));

      }

    },

    [sessionId, refresh],

  );



  const guidanceTyping = aiPending.guidance > 0;

  const visionTyping = aiPending.vision > 0;

  const translationTyping = aiPending.translation > 0;

  const transcriptionTyping = aiPending.transcription > 0;

  const aiBusy =
    guidanceTyping || visionTyping || translationTyping || transcriptionTyping;

  const reportError = useCallback((message: string) => {
    setError(message);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);



  return {

    sessionId,

    status,

    context,

    transcripts,

    translations,

    targetLanguage,

    suggestions,

    transcriptsTotal,

    translationsTotal,

    suggestionsTotal,

    loading,

    aiBusy,

    guidanceTyping,

    visionTyping,

    translationTyping,
    transcriptionTyping,

    error,
    translationError,
    interimTranscript,
    setMicInterim,
    setSystemInterim,
    clearMicInterim,
    clearSystemInterim,
    clearInterim,
    reportError,
    clearError,

    resetLiveSession,
    hydrateFromActiveSession,
    refreshContext,
    createAndStart,

    pause,

    resume,

    end,

    simulateTick,

    setTargetLanguageForSession,

    requestGuidance,

    analyzeImage,

    updateContext,

    copySuggestion,

    saveSuggestion,

  };

}


