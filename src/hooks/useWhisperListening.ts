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
/** Groq rejects very small / headerless fragments; skip tiny blobs. */
const MIN_UPLOAD_BYTES = 1200;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

 * Ambient listening via MediaRecorder → backend Groq Whisper STT.
 * Rotates the recorder every CHUNK_MS so each upload is a complete audio file.
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
  const mimeTypeRef = useRef<string>("audio/webm");
  const chunkPartsRef = useRef<Blob[]>([]);
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    mimeTypeRef.current = pickMimeType() ?? "audio/webm";
  }, []);

  const stopTracks = useCallback(() => {
    if (rotateTimerRef.current) {
      clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunkPartsRef.current = [];
  }, []);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (!blob.size || blob.size < MIN_UPLOAD_BYTES || !shouldListenRef.current) return;
      setIsTranscribing(true);
      setError(null);
      try {
        const result = await api.transcribeAudio(sessionId, blob, mimeTypeRef.current);
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

  const finalizeAndUpload = useCallback(async () => {
    const mimeType = mimeTypeRef.current;
    const parts = chunkPartsRef.current;
    chunkPartsRef.current = [];
    if (!parts.length) return;
    const blob = new Blob(parts, { type: mimeType });
    await uploadBlob(blob);
  }, [uploadBlob]);

  const beginRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !shouldListenRef.current) return;

    const mimeType = mimeTypeRef.current;
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    chunkPartsRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunkPartsRef.current.push(event.data);
      }
    };
    recorder.onerror = () => {
      setError("Recording error — try typed chunks instead.");
      shouldListenRef.current = false;
      setIsListening(false);
      stopTracks();
    };
    recorder.onstop = () => {
      void finalizeAndUpload().then(() => {
        if (shouldListenRef.current && streamRef.current) {
          beginRecorder();
        }
      });
    };

    recorder.start();
  }, [finalizeAndUpload, stopTracks]);

  const rotateRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    try {
      recorder.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Microphone recording is not supported in this browser.");
      return;
    }
    if (shouldListenRef.current) return;

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      shouldListenRef.current = true;
      setIsListening(true);

      beginRecorder();
      rotateTimerRef.current = setInterval(rotateRecorder, CHUNK_MS);
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      setError("Microphone access denied or unavailable.");
      stopTracks();
    }
  }, [beginRecorder, isSupported, rotateRecorder, stopTracks]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (rotateTimerRef.current) {
      clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    } else {
      stopTracks();
    }
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
