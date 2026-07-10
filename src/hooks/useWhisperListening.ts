"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiDiarizedUtterance } from "@/lib/api";
import { isLikelyWhisperHallucination } from "@/lib/whisperHallucination";
import { estimatePitchHz } from "@/lib/voicePitch";

export interface UseWhisperListeningReturn {
  isListening: boolean;
  isSupported: boolean;
  isTranscribing: boolean;
  error: string | null;
  transcript: string;
  lastChunk: string;
  utterances: ApiDiarizedUtterance[];
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  resetTranscript: () => void;
  syncUtterances: (items: ApiDiarizedUtterance[]) => void;
}

const CHUNK_MS = 5000;
const MIN_UPLOAD_BYTES = 1200;
const MIN_PEAK_RMS = 0.014;
const MIN_PITCH_HZ = 70;
const RMS_SAMPLE_MS = 250;

function samplePeakRms(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

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

/**
 * Ambient listening via MediaRecorder → backend Deepgram STT + voice/Deepgram diarization.
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
  const [utterances, setUtterances] = useState<ApiDiarizedUtterance[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const onChunkRef = useRef(onChunkFinalized);
  const mimeTypeRef = useRef<string>("audio/webm");
  const chunkPartsRef = useRef<Blob[]>([]);
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const peakRmsRef = useRef(0);
  const chunkPitchRef = useRef(0);
  const rmsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const syncUtterances = useCallback((items: ApiDiarizedUtterance[]) => {
    const filtered = items.filter((item) => !isLikelyWhisperHallucination(item.text));
    if (!filtered.length) return;
    setUtterances((prev) => {
      const byKey = new Map<string, ApiDiarizedUtterance>();
      for (const item of prev) {
        byKey.set(`${item.atSeconds}:${item.text}`, item);
      }
      for (const item of filtered) {
        byKey.set(`${item.atSeconds}:${item.text}`, item);
      }
      return Array.from(byKey.values()).sort((a, b) => a.atSeconds - b.atSeconds);
    });
  }, []);

  const stopTracks = useCallback(() => {
    if (rotateTimerRef.current) {
      clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    if (rmsTimerRef.current) {
      clearInterval(rmsTimerRef.current);
      rmsTimerRef.current = null;
    }
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    peakRmsRef.current = 0;
    chunkPitchRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunkPartsRef.current = [];
  }, []);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (!blob.size || blob.size < MIN_UPLOAD_BYTES || !shouldListenRef.current) return;
      if (peakRmsRef.current < MIN_PEAK_RMS) {
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        return;
      }
      if (chunkPitchRef.current > 0 && chunkPitchRef.current < MIN_PITCH_HZ && peakRmsRef.current < 0.02) {
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        return;
      }
      setIsTranscribing(true);
      setError(null);
      try {
        const pitchHz = chunkPitchRef.current > 0 ? chunkPitchRef.current : undefined;
        const result = await api.transcribeAudio(sessionId, blob, mimeTypeRef.current, pitchHz);
        const text = (result?.transcript || "").trim();
        if (text && result && !isLikelyWhisperHallucination(text)) {
          setLastChunk(text);
          setTranscript((prev) => {
            const spacer = prev && !prev.endsWith(" ") ? " " : "";
            return prev + spacer + text + " ";
          });
          const segmentUtterances =
            result.audioSegments?.filter((segment) => segment.text.trim()) ?? [];
          const items =
            segmentUtterances.length > 1
              ? segmentUtterances.map((segment, index) => ({
                  id: `${Date.now()}-${index}`,
                  speaker: segment.speaker,
                  text: segment.text.trim(),
                  atSeconds: result.atSeconds + Math.floor(segment.start),
                  endSeconds: result.atSeconds + Math.ceil(segment.end || segment.start + 1),
                  confidence: result.speakerConfidence,
                  diarizationMethod: result.diarizationMethod,
                }))
              : [
                  {
                    id: `${Date.now()}-${result.atSeconds}`,
                    speaker: result.speaker,
                    text,
                    atSeconds: result.atSeconds,
                    endSeconds: result.endSeconds ?? result.atSeconds + 5,
                    confidence: result.speakerConfidence,
                    diarizationMethod: result.diarizationMethod,
                  },
                ];
          setUtterances((prev) => [...prev, ...items]);
          onChunkRef.current?.(text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Whisper transcription failed";
        setError(msg);
      } finally {
        setIsTranscribing(false);
        peakRmsRef.current = 0;
    chunkPitchRef.current = 0;
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

  const startRmsMonitor = useCallback((stream: MediaStream) => {
    if (typeof window === "undefined" || !window.AudioContext) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    peakRmsRef.current = 0;
    chunkPitchRef.current = 0;
    if (rmsTimerRef.current) clearInterval(rmsTimerRef.current);
    rmsTimerRef.current = setInterval(() => {
      if (!analyserRef.current || !audioContextRef.current) return;
      peakRmsRef.current = Math.max(peakRmsRef.current, samplePeakRms(analyserRef.current));
      const pitch = estimatePitchHz(analyserRef.current, audioContextRef.current.sampleRate);
      if (pitch > 0) chunkPitchRef.current = pitch;
    }, RMS_SAMPLE_MS);
  }, []);

  const beginRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !shouldListenRef.current) return;

    const mimeType = mimeTypeRef.current;
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    chunkPartsRef.current = [];
    mediaRecorderRef.current = recorder;
    peakRmsRef.current = 0;
    chunkPitchRef.current = 0;

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

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Microphone recording is not supported in this browser.");
      return false;
    }
    if (shouldListenRef.current) return true;

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      shouldListenRef.current = true;
      setIsListening(true);

      startRmsMonitor(stream);
      beginRecorder();
      rotateTimerRef.current = setInterval(rotateRecorder, CHUNK_MS);
      return true;
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      setError("Microphone access denied or unavailable.");
      stopTracks();
      return false;
    }
  }, [beginRecorder, isSupported, rotateRecorder, startRmsMonitor, stopTracks]);

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
    setUtterances([]);
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
    utterances,
    startListening,
    stopListening,
    resetTranscript,
    syncUtterances,
  };
}
