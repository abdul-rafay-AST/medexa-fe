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
  initialMode?: LiveMode;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After Path A returns, Path B may still be running (Bedrock).
 * Poll a few times so chat feels "live" like ambient listening.
 */
async function waitForPathBSettled(
  sessionId: string,
  previousAssistantCount: number
): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await sleep(700);
    const [assistant, pipeline] = await Promise.all([
      api.getAssistantSuggestions(sessionId),
      api.getLivePipeline(sessionId),
    ]);
    const count = assistant?.length ?? 0;
    if (count > previousAssistantCount) return;
    const status = pipeline?.pathB?.status;
    if (status === "completed" || status === "skipped") return;
    if (pipeline?.pathB?.enabled === false) return;
  }
}

export function useLiveSession({
  sessionId,
  pollMs = 1500,
  initialMode = "chat",
}: UseLiveSessionOptions) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [recordingState, setRecordingState] = useState<ApiRecordingState | null>(null);
  const [insights, setInsights] = useState<ApiInsight[]>([]);
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([]);
  const [assistantSuggestions, setAssistantSuggestions] = useState<ApiAssistantSuggestion[]>([]);
  const [pipeline, setPipeline] = useState<ApiLivePipelineSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<LiveMode>(initialMode);
  const [sending, setSending] = useState(false);
  const [lastChunkError, setLastChunkError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasEverStarted, setHasEverStarted] = useState(false);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [pathBBusy, setPathBBusy] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const assistantCountRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    assistantCountRef.current = assistantSuggestions.length;
  }, [assistantSuggestions.length]);

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

  const ingestLiveChunk = useCallback(
    async (chunkText: string, durationSeconds: number) => {
      const startAt = elapsedRef.current;
      const beforeAssistant = assistantCountRef.current;

      const analysis = await api.analyzeTranscriptChunk(sessionId, chunkText, {
        elapsedSeconds: startAt,
        durationSeconds,
      });
      if (!analysis) {
        throw new Error("Chunk failed — check backend connection.");
      }

      // Advance simulated session clock the same way ambient audio clips do.
      setElapsed((prev) => Math.max(prev, startAt + durationSeconds));
      setHasEverStarted(true);
      setIsSessionRunning(true);

      await refreshLiveData();

      // Path B is async (Bedrock) — wait briefly so chat shows live assistant cards.
      setPathBBusy(true);
      try {
        await waitForPathBSettled(sessionId, beforeAssistant);
        await refreshLiveData();
      } finally {
        setPathBBusy(false);
      }

      return startAt;
    },
    [refreshLiveData, sessionId]
  );

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

      // Same cadence as ambient Whisper clips so billing / Path B triggers match.
      const durationSeconds = 15;
      const labeled = `${speaker === "therapist" ? "Therapist" : "Patient"}: ${body}`;

      setSending(true);
      setLastChunkError(null);
      try {
        await api.updateState(sessionId, "recording", elapsedRef.current);
        const startAt = await ingestLiveChunk(labeled, durationSeconds);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            speaker,
            text: body,
            atSeconds: startAt,
          },
        ]);
        return true;
      } catch (e) {
        setLastChunkError(
          e instanceof Error ? e.message : "Network error sending chat message."
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [ingestLiveChunk, isSessionRunning, loadError, sessionId, startSessionClock]
  );

  const handleAmbientChunk = useCallback(
    async (chunk: string) => {
      if (!chunk.trim() || loadError) return;
      try {
        await api.updateState(sessionId, "recording", elapsedRef.current);
        await ingestLiveChunk(chunk, 15);
      } catch (e) {
        console.error(e);
      }
    },
    [ingestLiveChunk, loadError, sessionId]
  );

  useEffect(() => {
    refreshLiveData();
    const interval = setInterval(refreshLiveData, pollMs);
    return () => clearInterval(interval);
  }, [refreshLiveData, pollMs]);

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
    pathBBusy,
    setIsSessionRunning,
    setHasEverStarted,
    refreshLiveData,
    startSessionClock,
    pauseSessionClock,
    sendChatMessage,
    handleAmbientChunk,
  };
}
