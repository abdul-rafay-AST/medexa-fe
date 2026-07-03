import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API type declarations for TS compiler
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
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

  useEffect(() => {
    onChunkRef.current = onChunkFinalized;
  }, [onChunkFinalized]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          finalTranscript += text + " ";
          onChunkRef.current?.(text.trim());
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // Benign / expected speech engine events — do not log as errors
        return;
      }
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        shouldListenRef.current = false;
        setIsListening(false);
        setError("Microphone access denied. Click Start Recording and allow microphone access.");
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart recognition", e);
          setIsListening(false);
        }
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
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Speech recognition is not ready yet. Try again in a moment.");
      return;
    }

    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("already started")) {
        setIsListening(true);
        return;
      }
      console.error("Error starting speech recognition", e);
      setError("Could not start recording. Click Start Recording again.");
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
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

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
