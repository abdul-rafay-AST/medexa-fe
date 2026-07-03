"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

function appendUnique(prev: string, chunk: string): string {
  const text = chunk.trim();
  if (!text) return prev;
  const normalizedPrev = prev.trimEnd().toLowerCase();
  const normalizedNew = text.toLowerCase();
  if (normalizedPrev.endsWith(normalizedNew)) return prev;
  if (normalizedPrev.includes(normalizedNew) && normalizedNew.length > 12) return prev;
  const spacer = prev && !prev.endsWith(" ") ? " " : "";
  return prev + spacer + text + " ";
}

export function useSpeechRecognition(
  onChunkFinalized?: (chunk: string) => void
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const shouldListenRef = useRef(false);
  const onChunkRef = useRef(onChunkFinalized);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sentChunksRef = useRef<Set<string>>(new Set());
  const buildRecognitionRef = useRef<(() => SpeechRecognition | null) | null>(null);

  useEffect(() => {
    onChunkRef.current = onChunkFinalized;
  }, [onChunkFinalized]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      setError("Speech recognition not supported. Use Chrome or Edge.");
      return;
    }

    setIsSupported(true);

    const build = (): SpeechRecognition | null => {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript.trim();
          if (!text) continue;

          if (result.isFinal) {
            const dedupeKey = text.toLowerCase().replace(/\s+/g, " ");
            if (sentChunksRef.current.has(dedupeKey)) continue;
            sentChunksRef.current.add(dedupeKey);
            setTranscript((prev) => appendUnique(prev, text));
            onChunkRef.current?.(text);
          } else {
            currentInterim += result[0].transcript;
          }
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        if (event.error === "not-allowed") {
          shouldListenRef.current = false;
          setIsListening(false);
          setError("Microphone access denied.");
        } else {
          setError(`Speech error: ${event.error}`);
        }
      };

      recognition.onstart = () => {
        setError(null);
        setIsListening(true);
      };

      recognition.onend = () => {
        if (!shouldListenRef.current) {
          setIsListening(false);
          return;
        }
        setTimeout(() => {
          if (!shouldListenRef.current) return;
          const next = buildRecognitionRef.current?.();
          if (next) {
            recognitionRef.current = next;
            try {
              next.start();
            } catch {
              setIsListening(false);
            }
          }
        }, 250);
      };

      return recognition;
    };

    buildRecognitionRef.current = build;
    recognitionRef.current = build();

    return () => {
      shouldListenRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current && buildRecognitionRef.current) {
      recognitionRef.current = buildRecognitionRef.current();
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Speech recognition is not ready.");
      return;
    }
    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already started")) {
        setError("Could not start recording.");
        shouldListenRef.current = false;
        setIsListening(false);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    sentChunksRef.current.clear();
  }, []);

  return {
    isListening,
    isSupported,
    error,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
