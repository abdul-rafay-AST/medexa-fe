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

export type LiveMode = "typed" | "ambient";

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
  const [mode, setMode] = useState<LiveMode>("typed");
  const [sending, setSending] = useState(false);
  const [lastChunkError, setLastChunkError] = useState<string | null>(null);
  const [typedLog, setTypedLog] = useState<string[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const sendTypedChunk = useCallback(
    async (text: string, options?: { advanceMinutes?: number; durationSeconds?: number }) => {
      const chunk = text.trim();
      if (!chunk || loadError) return false;

      const advanceMinutes = options?.advanceMinutes ?? 0;
      const durationSeconds = options?.durationSeconds ?? 60;
      const startAt = elapsed + advanceMinutes * 60;

      setSending(true);
      setLastChunkError(null);
      try {
        await api.updateState(sessionId, "recording", startAt);
        const analysis = await api.analyzeTranscriptChunk(sessionId, chunk, {
          elapsedSeconds: startAt,
          durationSeconds,
        });
        if (!analysis) {
          setLastChunkError("Chunk failed — is the backend running on localhost:8000?");
          return false;
        }
        setElapsed(startAt + durationSeconds);
        setTypedLog((prev) => [...prev, `[${formatElapsed(startAt)}] ${chunk}`]);
        await refreshLiveData();
        return true;
      } catch {
        setLastChunkError("Network error sending transcript chunk.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [elapsed, loadError, refreshLiveData, sessionId]
  );

  const handleAmbientChunk = useCallback(
    async (chunk: string) => {
      if (!chunk.trim() || loadError) return;
      await api.analyzeTranscriptChunk(sessionId, chunk, {
        elapsedSeconds: elapsed,
        durationSeconds: 15,
      });
      setElapsed((prev) => prev + 15);
      await refreshLiveData();
    },
    [elapsed, loadError, refreshLiveData, sessionId]
  );

  useEffect(() => {
    refreshLiveData();
    const interval = setInterval(refreshLiveData, pollMs);
    return () => clearInterval(interval);
  }, [refreshLiveData, pollMs]);

  useEffect(() => {
    if (mode !== "ambient" || recordingState?.status !== "recording") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [mode, recordingState?.status]);

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
    typedLog,
    refreshLiveData,
    sendTypedChunk,
    handleAmbientChunk,
  };
}
