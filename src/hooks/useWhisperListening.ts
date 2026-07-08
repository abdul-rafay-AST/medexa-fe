"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface UseWhisperListeningReturn {
  isListening: boolean;
  isSupported: boolean;
  isTranscribing: boolean;
  error: string | null;
  transcript: string;
  lastChunk: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

const CHUNK_MS = 5000;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Ambient listening via MediaRecorder → backend Groq Whisper STT.
 * Replaces unreliable browser Web Speech for Medexa live sessions.
 */
export function useWhisperListening(
  sessionId: string,
  onChunkFinalized?: (chunk: string) => void
): UseWhisperListeningReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [lastChunk, setLastChunk] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const onChunkRef = useRef(onChunkFinalized);
  const mimeTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    onChunkRef.current = onChunkFinalized;
  }, [onChunkFinalized]);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    setIsSupported(ok);
    mimeTypeRef.current = pickMimeType();
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (!blob.size || !shouldListenRef.current) return;
      setIsTranscribing(true);
      setError(null);
      try {
        const result = await api.transcribeAudio(sessionId, blob);
        const text = (result?.transcript || "").trim();
        if (text) {
          setLastChunk(text);
          setTranscript((prev) => {
            const spacer = prev && !prev.endsWith(" ") ? " " : "";
            return prev + spacer + text + " ";
          });
          onChunkRef.current?.(text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Whisper transcription failed";
        setError(msg);
      } finally {
        setIsTranscribing(false);
      }
    },
    [sessionId]
  );

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Microphone recording is not supported in this browser.");
      return;
    }
    if (shouldListenRef.current) return;

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = mimeTypeRef.current;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      shouldListenRef.current = true;
      setIsListening(true);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          void uploadBlob(event.data);
        }
      };
      recorder.onerror = () => {
        setError("Recording error — try typed chunks instead.");
        shouldListenRef.current = false;
        setIsListening(false);
        stopTracks();
      };
      recorder.start(CHUNK_MS);
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      setError("Microphone access denied or unavailable.");
      stopTracks();
    }
  }, [isSupported, stopTracks, uploadBlob]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    stopTracks();
    setIsListening(false);
  }, [stopTracks]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setLastChunk("");
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      stopTracks();
    };
  }, [stopTracks]);

  return {
    isListening,
    isSupported,
    isTranscribing,
    error,
    transcript,
    lastChunk,
    startListening,
    stopListening,
    resetTranscript,
  };
}
