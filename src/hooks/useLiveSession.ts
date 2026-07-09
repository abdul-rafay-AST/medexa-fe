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
  formatElapsed,
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
}

export function useLiveSession({ sessionId, pollMs = 2000 }: UseLiveSessionOptions) {
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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

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
      if (state.status === "recording") {
        setIsSessionRunning(true);
      } else if (state.status === "paused" || state.status === "stopped" || state.status === "idle") {
        // Don't force-stop local chat timer from poll races while actively chatting;
        // only sync elapsed upward.
      }
      setElapsed((prev) => Math.max(prev, state.elapsedSeconds));
    }
    if (resInsights) setInsights(resInsights);
    if (resSuggestions) setSuggestions(resSuggestions);
    if (resAssistant) setAssistantSuggestions(resAssistant);
    if (resPipeline) {
      setPipeline(resPipeline);
      setElapsed((prev) => Math.max(prev, resPipeline.elapsedSeconds));
    }
  }, [sessionId]);

  const startSessionClock = useCallback(async () => {
    setHasEverStarted(true);
    setIsSessionRunning(true);
    const state = await api.updateState(sessionId, "recording", elapsedRef.current);
    if (state) setRecordingState(state);
    await refreshLiveData();
  }, [refreshLiveData, sessionId]);

  const pauseSessionClock = useCallback(async () => {
    setIsSessionRunning(false);
    const state = await api.updateState(sessionId, "paused", elapsedRef.current);
    if (state) setRecordingState(state);
    await refreshLiveData();
  }, [refreshLiveData, sessionId]);

  const sendChatMessage = useCallback(
    async (speaker: ChatSpeaker, text: string) => {
      const body = text.trim();
      if (!body || loadError) return false;

      if (!isSessionRunning) {
        await startSessionClock();
      }

      const startAt = elapsedRef.current;
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
          setLastChunkError("Message failed — is the backend running on localhost:8000?");
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
        // Keep live timer ahead of the chunk window so the next line lands after this one.
        setElapsed((prev) => Math.max(prev, startAt + durationSeconds));
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
    [isSessionRunning, loadError, refreshLiveData, sessionId, startSessionClock]
  );

  const handleAmbientChunk = useCallback(
    async (chunk: string) => {
      if (!chunk.trim() || loadError) return;
      const startAt = elapsedRef.current;
      await api.analyzeTranscriptChunk(sessionId, chunk, {
        elapsedSeconds: startAt,
        durationSeconds: 15,
      });
      setElapsed((prev) => Math.max(prev, startAt + 15));
      setHasEverStarted(true);
      await refreshLiveData();
    },
    [loadError, refreshLiveData, sessionId]
  );

  useEffect(() => {
    refreshLiveData();
    const interval = setInterval(refreshLiveData, pollMs);
    return () => clearInterval(interval);
  }, [refreshLiveData, pollMs]);

  // Live wall-clock tick for chat + ambient while session is running.
  useEffect(() => {
    if (!isSessionRunning) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isSessionRunning]);

  return {
    session,
    recordingState,
    insights,
    suggestions,
    assistantSuggestions,
    pipeline,
    loadError,
    elapsed,
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
  };
}
