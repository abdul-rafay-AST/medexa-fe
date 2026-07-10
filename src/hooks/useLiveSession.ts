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

type BillingAnchors = {
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
  const [activeCptCode, setActiveCptCode] = useState<string | null>(null);

  const sessionTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(0);
  const isSessionRunningRef = useRef(false);
  const billingAnchorsRef = useRef<BillingAnchors>({
    cptSeconds: 0,
    billingSeconds: 0,
    timeLeftSeconds: 8 * 60,
    atMs: Date.now(),
  });
  /** Simulated transcript timeline — advances per message, not wall clock. */
  const transcriptElapsedRef = useRef(0);
  const useTranscriptClockRef = useRef(false);

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
    elapsedRef.current = baseElapsed;
  }, []);

  const pauseSessionClockLocal = useCallback(() => {
    const current = getWallClockElapsed();
    elapsedAtStartRef.current = current;
    sessionStartedAtRef.current = null;
    setElapsed(current);
    elapsedRef.current = current;
  }, [getWallClockElapsed]);

  const snapBillingAnchors = useCallback((state: ApiRecordingState) => {
    const atMs = Date.now();
    const serverCpt = state.cptElapsedSeconds ?? 0;
    const serverBilling = state.billingElapsedSeconds ?? 0;
    const serverLeft = state.timeLeft ?? 8 * 60;

    billingAnchorsRef.current = {
      cptSeconds: serverCpt,
      billingSeconds: serverBilling,
      timeLeftSeconds: serverLeft,
      atMs,
    };
    setCptElapsed(serverCpt);
    setBillingElapsed(serverBilling);
    setTimeLeft(serverLeft);
  }, []);

  const syncSessionClockFromServer = useCallback(
    (state: ApiRecordingState) => {
      const serverElapsed = state.elapsedSeconds ?? 0;
      transcriptElapsedRef.current = Math.max(transcriptElapsedRef.current, serverElapsed);
      if (state.status === "recording") {
        setIsSessionRunning(true);
        if (sessionStartedAtRef.current === null) {
          armSessionClock(serverElapsed);
          return;
        }
        const local = getWallClockElapsed();
        if (serverElapsed > local + 1) {
          armSessionClock(serverElapsed);
        }
        return;
      }

      if (state.status === "paused" || state.status === "stopped") {
        setIsSessionRunning(false);
        pauseSessionClockLocal();
        setElapsed(serverElapsed);
        elapsedRef.current = serverElapsed;
        elapsedAtStartRef.current = serverElapsed;
      }
    },
    [armSessionClock, getWallClockElapsed, pauseSessionClockLocal]
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
      syncSessionClockFromServer(state);
      snapBillingAnchors(state);
    }

    if (resInsights) setInsights(resInsights);
    if (resSuggestions) setSuggestions(resSuggestions);
    if (resAssistant) setAssistantSuggestions(resAssistant);

    if (resPipeline) {
      setPipeline(resPipeline);
      setActiveCptCode(resPipeline.pathA.activeCpt ?? null);
      if (!state) {
        setElapsed(resPipeline.elapsedSeconds ?? 0);
        setCptElapsed(resPipeline.pathA.cptElapsedSeconds ?? 0);
        setBillingElapsed(resPipeline.pathA.sessionTimerSec ?? 0);
      }
    }
  }, [sessionId, snapBillingAnchors, syncSessionClockFromServer]);

  const startSessionClock = useCallback(async () => {
    setHasEverStarted(true);
    setIsSessionRunning(true);
    const base = getWallClockElapsed();
    armSessionClock(base);
    const state = await api.updateState(sessionId, "recording", base);
    if (state) {
      setRecordingState(state);
      snapBillingAnchors(state);
    }
    await refreshLiveData();
  }, [armSessionClock, getWallClockElapsed, refreshLiveData, sessionId, snapBillingAnchors]);

  const pauseSessionClock = useCallback(async () => {
    setIsSessionRunning(false);
    const current = getWallClockElapsed();
    pauseSessionClockLocal();
    const state = await api.updateState(sessionId, "paused", current);
    if (state) {
      setRecordingState(state);
      snapBillingAnchors(state);
    }
    await refreshLiveData();
  }, [getWallClockElapsed, pauseSessionClockLocal, refreshLiveData, sessionId, snapBillingAnchors]);

  const sendChatMessage = useCallback(
    async (speaker: ChatSpeaker, text: string) => {
      const body = text.trim();
      if (!body || loadError) return false;

      if (!isSessionRunning) {
        await startSessionClock();
      }

      useTranscriptClockRef.current = true;
      const startAt = transcriptElapsedRef.current;
      const durationSeconds = Math.max(8, Math.min(30, Math.ceil(body.split(/\s+/).length * 1.5)));
      const endAt = startAt + durationSeconds;
      const labeled = `${speaker === "therapist" ? "Therapist" : "Patient"}: ${body}`;

      setSending(true);
      setLastChunkError(null);
      try {
        const analysis = await api.analyzeTranscriptChunk(sessionId, labeled, {
          elapsedSeconds: startAt,
          durationSeconds,
        });
        if (!analysis) {
          setLastChunkError("Message failed. Please check network connection or backend logs.");
          return false;
        }

        transcriptElapsedRef.current = endAt;
        elapsedAtStartRef.current = endAt;
        sessionStartedAtRef.current = null;
        setElapsed(endAt);
        elapsedRef.current = endAt;
        await api.updateState(sessionId, "recording", endAt);

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
      isSessionRunning,
      loadError,
      refreshLiveData,
      sessionId,
      startSessionClock,
    ]
  );

  const handleAmbientTranscribed = useCallback(async () => {
    if (loadError) return;
    if (!isSessionRunningRef.current) {
      await startSessionClock();
    }
    const elapsed = getWallClockElapsed() + 5;
    await api.updateState(sessionId, "recording", elapsed);
    setHasEverStarted(true);
    await refreshLiveData();
  }, [getWallClockElapsed, loadError, refreshLiveData, sessionId, startSessionClock]);

  const applySuggestion = useCallback(
    async (suggestionId: string) => {
      billingAnchorsRef.current = {
        cptSeconds: 0,
        billingSeconds: billingAnchorsRef.current.billingSeconds,
        timeLeftSeconds: billingAnchorsRef.current.timeLeftSeconds,
        atMs: Date.now(),
      };
      setCptElapsed(0);
      await api.applySuggestion(sessionId, suggestionId);
      await refreshLiveData();
    },
    [refreshLiveData, sessionId]
  );

  const billingTickActive =
    isSessionRunning &&
    !disableTick &&
    Boolean(activeCptCode || (recordingState?.cptElapsedSeconds ?? 0) > 0);

  useEffect(() => {
    refreshLiveData();
    const interval = setInterval(refreshLiveData, pollMs);
    return () => clearInterval(interval);
  }, [refreshLiveData, pollMs]);

  useEffect(() => {
    if (!isSessionRunning || disableTick || useTranscriptClockRef.current) {
      if (sessionTickRef.current) {
        clearInterval(sessionTickRef.current);
        sessionTickRef.current = null;
      }
      return;
    }

    sessionTickRef.current = setInterval(() => {
      setElapsed(getWallClockElapsed());
    }, 1000);

    return () => {
      if (sessionTickRef.current) {
        clearInterval(sessionTickRef.current);
        sessionTickRef.current = null;
      }
    };
  }, [disableTick, getWallClockElapsed, isSessionRunning]);

  useEffect(() => {
    if (!billingTickActive) {
      if (billingTickRef.current) {
        clearInterval(billingTickRef.current);
        billingTickRef.current = null;
      }
      return;
    }

    billingTickRef.current = setInterval(() => {
      const anchors = billingAnchorsRef.current;
      const deltaSec = Math.floor((Date.now() - anchors.atMs) / 1000);
      setCptElapsed(anchors.cptSeconds + deltaSec);
      setBillingElapsed(anchors.billingSeconds + deltaSec);
      setTimeLeft(Math.max(0, anchors.timeLeftSeconds - deltaSec));
    }, 1000);

    return () => {
      if (billingTickRef.current) {
        clearInterval(billingTickRef.current);
        billingTickRef.current = null;
      }
    };
  }, [billingTickActive]);

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
    activeCptCode,
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
    handleAmbientTranscribed,
    applySuggestion,
    getWallClockElapsed,
  };
}
