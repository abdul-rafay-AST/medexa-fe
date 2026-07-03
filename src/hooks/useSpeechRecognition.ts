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

export function useSpeechRecognition(
  onChunkFinalized?: (chunk: string) => void
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const onChunkRef = useRef(onChunkFinalized);
  // Use a Set of normalized phrase strings to prevent any duplicate from being processed
  const seenFinalPhrases = useRef<Set<string>>(new Set());

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
          // Normalize to lowercase for dedup key, but keep original for display
          const dedupeKey = text.toLowerCase().replace(/\s+/g, " ");
          if (!seenFinalPhrases.current.has(dedupeKey)) {
            seenFinalPhrases.current.add(dedupeKey);
            setTranscript((prev) => prev + text + " ");
            onChunkRef.current?.(text);
          }
        } else {
          currentInterim += result[0].transcript;
        }
      }

      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        shouldListenRef.current = false;
        setIsListening(false);
        setError("Microphone access denied. Please allow microphone access and try again.");
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        // Small delay before restart to prevent rapid-restart loops on mobile Safari/Chrome
        setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (_e) {
              setIsListening(false);
            }
          }
        }, 150);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onstart = null;
      recognition.onend = null;
      try { recognition.stop(); } catch (_e) { /* ignore */ }
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Speech recognition is not ready. Try again.");
      return;
    }
    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already started")) {
        setIsListening(true);
        return;
      }
      console.error("Failed to start recognition:", e);
      setError("Could not start recording. Please try again.");
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    try { recognitionRef.current?.stop(); } catch (_e) { /* ignore */ }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    seenFinalPhrases.current.clear();
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
