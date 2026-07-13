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

const MIN_UPLOAD_BYTES = 400;
const MIN_PEAK_RMS = 0.008;
const SPEECH_RMS = 0.008;
const SILENCE_END_MS = 900;
const MIN_SPEECH_MS = 250;
const MAX_UTTERANCE_MS = 45000;
const VAD_TICK_MS = 80;
const RECORDER_TIMESLICE_MS = 200;

function sampleRms(analyser: AnalyserNode): number {
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
 * Ambient listening — one continuous recorder, utterance boundaries from VAD.
 * Each completed speech pause uploads to Deepgram + voice diarization on the backend.
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
  const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const utterancePartsRef = useRef<Blob[]>([]);
  const utteranceActiveRef = useRef(false);
  const peakRmsRef = useRef(0);
  const chunkPitchRef = useRef(0);
  const speechMsRef = useRef(0);
  const silenceMsRef = useRef(0);
  const utteranceStartedAtRef = useRef(0);
  const lastUtteranceDurationSecRef = useRef(0);

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
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    utterancePartsRef.current = [];
    utteranceActiveRef.current = false;
    peakRmsRef.current = 0;
    chunkPitchRef.current = 0;
    speechMsRef.current = 0;
    silenceMsRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (!blob.size || blob.size < MIN_UPLOAD_BYTES || !shouldListenRef.current) return;
      if (peakRmsRef.current < MIN_PEAK_RMS) {
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        return;
      }
      setIsTranscribing(true);
      setError(null);
      const durationSec = Math.max(
        0.25,
        lastUtteranceDurationSecRef.current || blob.size / 3200
      );
      try {
        const pitchHz = chunkPitchRef.current > 0 ? chunkPitchRef.current : undefined;
        const result = await api.transcribeAudio(
          sessionId,
          blob,
          mimeTypeRef.current,
          pitchHz,
          durationSec
        );
        const text = (result?.transcript || "").trim();
        if (text && result && !isLikelyWhisperHallucination(text)) {
          setLastChunk(text);
          setTranscript((prev) => {
            const spacer = prev && !prev.endsWith(" ") ? " " : "";
            return prev + spacer + text + " ";
          });
          const endSeconds =
            result.endSeconds ??
            result.atSeconds + Math.max(1, Math.ceil(durationSec));
          const segmentUtterances =
            result.audioSegments?.filter((segment) => segment.text.trim()) ?? [];
          const items =
            segmentUtterances.length > 1
              ? segmentUtterances.map((segment, index) => ({
                  id: `${Date.now()}-${index}`,
                  speaker: segment.speaker,
                  text: segment.text.trim(),
                  atSeconds: result.atSeconds + Math.floor(segment.start),
                  endSeconds:
                    result.atSeconds + Math.ceil(segment.end || segment.start + 1),
                  confidence: result.speakerConfidence,
                  diarizationMethod: result.diarizationMethod,
                }))
              : [
                  {
                    id: `${Date.now()}-${result.atSeconds}`,
                    speaker: result.speaker,
                    text,
                    atSeconds: result.atSeconds,
                    endSeconds,
                    confidence: result.speakerConfidence,
                    diarizationMethod: result.diarizationMethod,
                  },
                ];
          setUtterances((prev) => [...prev, ...items]);
          onChunkRef.current?.(text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Transcription failed";
        setError(msg);
      } finally {
        setIsTranscribing(false);
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        lastUtteranceDurationSecRef.current = 0;
      }
    },
    [sessionId]
  );

  const finalizeUtterance = useCallback(() => {
    if (!utteranceActiveRef.current) return;
    utteranceActiveRef.current = false;
    speechMsRef.current = 0;
    silenceMsRef.current = 0;
    lastUtteranceDurationSecRef.current = Math.max(
      0.25,
      (Date.now() - utteranceStartedAtRef.current) / 1000
    );
    const parts = [...utterancePartsRef.current];
    utterancePartsRef.current = [];
    if (!parts.length) return;
    const blob = new Blob(parts, { type: mimeTypeRef.current });
    void uploadBlob(blob);
  }, [uploadBlob]);

  const runVoiceActivityDetection = useCallback(() => {
    if (!analyserRef.current || !shouldListenRef.current) return;

    const rms = sampleRms(analyserRef.current);
    const speaking = rms >= SPEECH_RMS;

    if (speaking) {
      silenceMsRef.current = 0;
      if (!utteranceActiveRef.current) {
        utteranceActiveRef.current = true;
        utterancePartsRef.current = [];
        speechMsRef.current = 0;
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        utteranceStartedAtRef.current = Date.now();
      }
      peakRmsRef.current = Math.max(peakRmsRef.current, rms);
      if (audioContextRef.current) {
        const pitch = estimatePitchHz(analyserRef.current, audioContextRef.current.sampleRate);
        if (pitch > 0) chunkPitchRef.current = pitch;
      }
      speechMsRef.current += VAD_TICK_MS;
      if (speechMsRef.current >= MAX_UTTERANCE_MS) {
        finalizeUtterance();
      }
      return;
    }

    if (!utteranceActiveRef.current) return;
    silenceMsRef.current += VAD_TICK_MS;
    if (silenceMsRef.current >= SILENCE_END_MS && speechMsRef.current >= MIN_SPEECH_MS) {
      finalizeUtterance();
    }
  }, [finalizeUtterance]);

  const startContinuousRecorder = useCallback((stream: MediaStream) => {
    const mimeType = mimeTypeRef.current;
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && utteranceActiveRef.current) {
        utterancePartsRef.current.push(event.data);
      }
    };
    recorder.onerror = () => {
      setError("Recording error — try typed chunks instead.");
      shouldListenRef.current = false;
      setIsListening(false);
      stopTracks();
    };

    mediaRecorderRef.current = recorder;
    recorder.start(RECORDER_TIMESLICE_MS);
  }, [stopTracks]);

  const startVadMonitor = useCallback(
    async (stream: MediaStream) => {
      if (typeof window === "undefined" || !window.AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      if (vadTimerRef.current) clearInterval(vadTimerRef.current);
      vadTimerRef.current = setInterval(runVoiceActivityDetection, VAD_TICK_MS);
    },
    [runVoiceActivityDetection]
  );

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
      await startVadMonitor(stream);
      startContinuousRecorder(stream);
      return true;
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      setError("Microphone access denied or unavailable.");
      stopTracks();
      return false;
    }
  }, [isSupported, startContinuousRecorder, startVadMonitor, stopTracks]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (utteranceActiveRef.current) {
      finalizeUtterance();
    }
    stopTracks();
    setIsListening(false);
  }, [finalizeUtterance, stopTracks]);

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
