"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiDiarizedUtterance } from "@/lib/api";
import { encodeWav, TARGET_SAMPLE_RATE } from "@/lib/encodeWav";
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

const MIN_UPLOAD_BYTES = 600;
const MIN_PEAK_RMS = 0.006;
const SPEECH_RMS = 0.006;
const SILENCE_END_MS = 400;
const MIN_SPEECH_MS = 300;
/** Upload every 3s while speaking — avoids waiting 30s for MAX_UTTERANCE. */
const ROTATE_SPEECH_MS = 3000;
const MAX_UTTERANCE_MS = 6000;
const VAD_TICK_MS = 40;
const PCM_BUFFER_SIZE = 2048;

function sampleRms(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

function mergePcmChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/**
 * Ambient listening — rolling 3s WAV uploads while speaking.
 * Previously MAX_UTTERANCE_MS=30000 caused ~30s delay before first transcript.
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

  const streamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const onChunkRef = useRef(onChunkFinalized);
  const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sampleRateRef = useRef(TARGET_SAMPLE_RATE);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const utteranceActiveRef = useRef(false);
  const peakRmsRef = useRef(0);
  const chunkPitchRef = useRef(0);
  const speechMsRef = useRef(0);
  const silenceMsRef = useRef(0);
  const utteranceStartedAtRef = useRef(0);
  const lastUtteranceDurationSecRef = useRef(0);
  const uploadsInFlightRef = useRef(0);

  useEffect(() => {
    onChunkRef.current = onChunkFinalized;
  }, [onChunkFinalized]);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.AudioContext !== "undefined";
    setIsSupported(ok);
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
    processorRef.current?.disconnect();
    processorRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    pcmChunksRef.current = [];
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
        return;
      }
      uploadsInFlightRef.current += 1;
      setIsTranscribing(true);
      setError(null);
      const capturedPeak = peakRmsRef.current;
      const capturedPitch = chunkPitchRef.current;
      const durationSec = Math.max(
        0.25,
        lastUtteranceDurationSecRef.current || blob.size / 32000
      );
      try {
        const pitchHz = capturedPitch > 0 ? capturedPitch : undefined;
        const result = await api.transcribeAudio(
          sessionId,
          blob,
          "audio/wav",
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
        uploadsInFlightRef.current = Math.max(0, uploadsInFlightRef.current - 1);
        if (uploadsInFlightRef.current === 0) {
          setIsTranscribing(false);
        }
      }
    },
    [sessionId]
  );

  const flushPcm = useCallback(
    (endUtterance: boolean) => {
      if (!utteranceActiveRef.current) return;

      const chunks = [...pcmChunksRef.current];
      pcmChunksRef.current = [];
      speechMsRef.current = 0;

      if (endUtterance) {
        utteranceActiveRef.current = false;
        silenceMsRef.current = 0;
        lastUtteranceDurationSecRef.current = Math.max(
          0.25,
          (Date.now() - utteranceStartedAtRef.current) / 1000
        );
      }

      if (!chunks.length) {
        if (endUtterance) {
          peakRmsRef.current = 0;
          chunkPitchRef.current = 0;
        }
        return;
      }

      const merged = mergePcmChunks(chunks);
      const minSamples = Math.floor(sampleRateRef.current * 0.25);
      if (merged.length < minSamples) {
        if (endUtterance) {
          peakRmsRef.current = 0;
          chunkPitchRef.current = 0;
        }
        return;
      }

      if (endUtterance && analyserRef.current && audioContextRef.current) {
        const pitch = estimatePitchHz(analyserRef.current, audioContextRef.current.sampleRate);
        if (pitch > 0) chunkPitchRef.current = pitch;
      }

      if (!endUtterance) {
        lastUtteranceDurationSecRef.current = ROTATE_SPEECH_MS / 1000;
      }

      const blob = encodeWav(merged, sampleRateRef.current);
      void uploadBlob(blob);

      if (endUtterance) {
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        lastUtteranceDurationSecRef.current = 0;
      }
    },
    [uploadBlob]
  );

  const runVoiceActivityDetection = useCallback(() => {
    if (!analyserRef.current || !shouldListenRef.current) return;

    const rms = sampleRms(analyserRef.current);
    const speaking = rms >= SPEECH_RMS;

    if (speaking) {
      silenceMsRef.current = 0;
      if (!utteranceActiveRef.current) {
        utteranceActiveRef.current = true;
        pcmChunksRef.current = [];
        speechMsRef.current = 0;
        peakRmsRef.current = 0;
        chunkPitchRef.current = 0;
        utteranceStartedAtRef.current = Date.now();
      }
      peakRmsRef.current = Math.max(peakRmsRef.current, rms);
      speechMsRef.current += VAD_TICK_MS;
      if (speechMsRef.current >= ROTATE_SPEECH_MS) {
        flushPcm(false);
      } else if (speechMsRef.current >= MAX_UTTERANCE_MS) {
        flushPcm(false);
      }
      return;
    }

    if (!utteranceActiveRef.current) return;
    silenceMsRef.current += VAD_TICK_MS;
    if (silenceMsRef.current >= SILENCE_END_MS && speechMsRef.current >= MIN_SPEECH_MS) {
      flushPcm(true);
    }
  }, [flushPcm]);

  const startAudioCapture = useCallback(
    async (stream: MediaStream) => {
      if (typeof window === "undefined" || !window.AudioContext) return;
      const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      sampleRateRef.current = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const processor = ctx.createScriptProcessor(PCM_BUFFER_SIZE, 1, 1);
      processor.onaudioprocess = (event) => {
        if (!utteranceActiveRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };
      analyser.connect(processor);
      processor.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      processorRef.current = processor;

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
      await startAudioCapture(stream);
      return true;
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      setError("Microphone access denied or unavailable.");
      stopTracks();
      return false;
    }
  }, [isSupported, startAudioCapture, stopTracks]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (utteranceActiveRef.current) {
      flushPcm(true);
    }
    stopTracks();
    setIsListening(false);
  }, [flushPcm, stopTracks]);

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
