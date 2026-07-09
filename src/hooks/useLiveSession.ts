"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  ApiAssistantSuggestion,
  ApiInsight,
  ApiLivePipelineSnapshot,
  ApiRecordingState,
  ApiSession,
  ApiSuggestion,
} from "@/lib/api";

export type LiveMode = "chat" | "ambient";
export type ChatSpeaker = "therapist" | "patient";

export interface ChatMessage {
  id: string;
  speaker: ChatSpeaker;
  text: string;
  atSeconds: number;
}

export interface UseLiveSessionOptions {
  sessionId: string;
  pollMs?: number;
  disableTick?: boolean;
}

type TimerAnchors = {
  cptSeconds: number;
  billingSeconds: number;
  timeLeftSeconds: number;
  atMs: number;
};

export function useLiveSession({ sessionId, pollMs = 2000, disableTick = false }: UseLiveSessionOptions) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [recordingState, setRecordingState] = useState<ApiRecordingState | null>(null);
  const [insights, setInsights] = useState<ApiInsight[]>([]);
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([]);
  const [assistantSuggestions, setAssistantSuggestions] = useState<ApiAssistantSuggestion[]>([]);
  const [pipeline, setPipeline] = useState<ApiLivePipelineSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<LiveMode>("chat");
  const [sending, setSending] = useState(false);
  const [lastChunkError, setLastChunkError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasEverStarted, setHasEverStarted] = useState(false);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [cptElapsed, setCptElapsed] = useState(0);
  const [billingElapsed, setBillingElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8 * 60);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(0);
  const isSessionRunningRef = useRef(false);
  const activeCptRef = useRef<string | null>(null);
  const timerAnchorsRef = useRef<TimerAnchors>({
    cptSeconds: 0,
    billingSeconds: 0,
    timeLeftSeconds: 8 * 60,
    atMs: Date.now(),
  });

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    isSessionRunningRef.current = isSessionRunning;
  }, [isSessionRunning]);

  const getWallClockElapsed = useCallback(() => {
    if (sessionStartedAtRef.current === null) {
      return elapsedAtStartRef.current;
    }
    if (!isSessionRunningRef.current) {
      return elapsedRef.current;
    }
    return (
      elapsedAtStartRef.current +
      Math.floor((Date.now() - sessionStartedAtRef.current) / 1000)
    );
  }, []);

  const armSessionClock = useCallback((baseElapsed: number) => {
    elapsedAtStartRef.current = baseElapsed;
    sessionStartedAtRef.current = Date.now();
    setElapsed(baseElapsed);
  }, []);

  const pauseSessionClockLocal = useCallback(() => {
    const current = getWallClockElapsed();
    elapsedAtStartRef.current = current;
    sessionStartedAtRef.current = null;
    setElapsed(current);
  }, [getWallClockElapsed]);

  const applyTimerAnchors = useCallback((state: ApiRecordingState) => {
    timerAnchorsRef.current = {
      cptSeconds: state.cptElapsedSeconds ?? 0,
      billingSeconds: state.billingElapsedSeconds ?? 0,
      timeLeftSeconds: state.timeLeft ?? 8 * 60,
      atMs: Date.now(),
    };
    setCptElapsed(timerAnchorsRef.current.cptSeconds);
    setBillingElapsed(timerAnchorsRef.current.billingSeconds);
    setTimeLeft(timerAnchorsRef.current.timeLeftSeconds);
  }, []);

  const syncSessionStatus = useCallback(
    (state: ApiRecordingState) => {
      if (state.status === "recording") {
        setIsSessionRunning(true);
        if (sessionStartedAtRef.current === null) {
          armSessionClock(state.elapsedSeconds ?? 0);
        }
      } else if (state.status === "paused" || state.status === "stopped") {
        setIsSessionRunning(false);
        pauseSessionClockLocal();
        setElapsed(state.elapsedSeconds ?? elapsedRef.current);
      }
    },
    [armSessionClock, pauseSessionClockLocal]
  );

  const refreshLiveData = useCallback(async () => {
    const [sessionData, state, resInsights, resSuggestions, resAssistant, resPipeline] =
      await Promise.all([
        api.getSession(sessionId),
        api.getState(sessionId),
        api.getInsights(sessionId),
        api.getSuggestions(sessionId),
        api.getAssistantSuggestions(sessionId),
        api.getLivePipeline(sessionId),
      ]);

    if (!sessionData) {
      setLoadError(
        sessionId === "1"
          ? "This demo link is static. Go back and click Start a new session."
          : "Session not found. Start a new session from the dashboard."
      );
      return;
    }

    setLoadError(null);
    setSession(sessionData);
    if (state) {
      setRecordingState(state);
      if (state.status === "recording" || state.status === "paused" || state.status === "stopped") {
        setHasEverStarted(true);
      }
      applyTimerAnchors(state);
      syncSessionStatus(state);
    }
    if (resInsights) setInsights(resInsights);
    if (resSuggestions) setSuggestions(resSuggestions);
    if (resAssistant) setAssistantSuggestions(resAssistant);
    if (resPipeline) {
      setPipeline(resPipeline);
      activeCptRef.current = resPipeline.pathA.activeCpt ?? null;
      if (!state) {
        const fallbackBilling = resPipeline.pathA.sessionTimerSec ?? 0;
        const fallbackCpt = resPipeline.pathA.cptElapsedSeconds ?? 0;
        timerAnchorsRef.current = {
          cptSeconds: fallbackCpt,
          billingSeconds: fallbackBilling,
          timeLeftSeconds: Math.max(0, 8 * 60 - fallbackBilling),
          atMs: Date.now(),
        };
        setCptElapsed(fallbackCpt);
        setBillingElapsed(fallbackBilling);
        setTimeLeft(timerAnchorsRef.current.timeLeftSeconds);
        setElapsed(resPipeline.elapsedSeconds ?? 0);
      }
    }
  }, [applyTimerAnchors, sessionId, syncSessionStatus]);

  const startSessionClock = useCallback(async () => {
    setHasEverStarted(true);
    setIsSessionRunning(true);
    const base = getWallClockElapsed();
    armSessionClock(base);
    const state = await api.updateState(sessionId, "recording", base);
    if (state) {
      setRecordingState(state);
      applyTimerAnchors(state);
    }
    await refreshLiveData();
  }, [applyTimerAnchors, armSessionClock, getWallClockElapsed, refreshLiveData, sessionId]);

  const pauseSessionClock = useCallback(async () => {
    setIsSessionRunning(false);
    const current = getWallClockElapsed();
    pauseSessionClockLocal();
    const state = await api.updateState(sessionId, "paused", current);
    if (state) {
      setRecordingState(state);
      applyTimerAnchors(state);
    }
    await refreshLiveData();
  }, [applyTimerAnchors, getWallClockElapsed, pauseSessionClockLocal, refreshLiveData, sessionId]);

  const sendChatMessage = useCallback(
    async (speaker: ChatSpeaker, text: string) => {
      const body = text.trim();
      if (!body || loadError) return false;

      if (!isSessionRunning) {
        await startSessionClock();
      }

      const startAt = getWallClockElapsed();
      const durationSeconds = Math.max(5, Math.min(30, Math.ceil(body.split(/\s+/).length * 1.5)));
      const labeled = `${speaker === "therapist" ? "Therapist" : "Patient"}: ${body}`;

      setSending(true);
      setLastChunkError(null);
      try {
        await api.updateState(sessionId, "recording", startAt);
        const analysis = await api.analyzeTranscriptChunk(sessionId, labeled, {
          elapsedSeconds: startAt,
          durationSeconds,
        });
        if (!analysis) {
          setLastChunkError("Message failed. Please check network connection or backend logs.");
          return false;
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            speaker,
            text: body,
            atSeconds: startAt,
          },
        ]);
        setIsSessionRunning(true);
        setHasEverStarted(true);
        await refreshLiveData();
        return true;
      } catch {
        setLastChunkError("Network error sending chat message.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      getWallClockElapsed,
      isSessionRunning,
      loadError,
      refreshLiveData,
      sessionId,
      startSessionClock,
    ]
  );

  const handleAmbientChunk = useCallback(
    async (chunk: string) => {
      if (!chunk.trim() || loadError) return;
      const startAt = getWallClockElapsed();
      await api.analyzeTranscriptChunk(sessionId, chunk, {
        elapsedSeconds: startAt,
        durationSeconds: 1,
      });
      setHasEverStarted(true);
      await refreshLiveData();
    },
    [getWallClockElapsed, loadError, refreshLiveData, sessionId]
  );

  useEffect(() => {
    refreshLiveData();
    const intervalMs =
      isSessionRunning && activeCptRef.current ? Math.min(pollMs, 1000) : pollMs;
    const interval = setInterval(refreshLiveData, intervalMs);
    return () => clearInterval(interval);
  }, [refreshLiveData, pollMs, isSessionRunning, pipeline?.pathA.activeCpt]);

  useEffect(() => {
    const billingActive =
      isSessionRunning && Boolean(activeCptRef.current || recordingState?.cptElapsedSeconds);

    if (!billingActive || disableTick) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      setElapsed(getWallClockElapsed());
      const anchors = timerAnchorsRef.current;
      const delta = Math.floor((Date.now() - anchors.atMs) / 1000);
      setCptElapsed(anchors.cptSeconds + delta);
      setBillingElapsed(anchors.billingSeconds + delta);
      setTimeLeft(Math.max(0, anchors.timeLeftSeconds - delta));
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [
    disableTick,
    getWallClockElapsed,
    isSessionRunning,
    pipeline?.pathA.activeCpt,
    recordingState?.cptElapsedSeconds,
  ]);

  return {
    session,
    recordingState,
    insights,
    suggestions,
    assistantSuggestions,
    pipeline,
    loadError,
    elapsed,
    billingElapsed,
    cptElapsed,
    timeLeft,
    setElapsed,
    mode,
    setMode,
    sending,
    lastChunkError,
    chatMessages,
    hasEverStarted,
    isSessionRunning,
    setIsSessionRunning,
    setHasEverStarted,
    refreshLiveData,
    startSessionClock,
    pauseSessionClock,
    sendChatMessage,
    handleAmbientChunk,
    getWallClockElapsed,
  };
}
