"use client";

import { FormEvent, useState } from "react";
import { Keyboard, Loader2, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatElapsed } from "@/lib/api";
import type { LiveMode } from "@/hooks/useLiveSession";

const DEMO_LINES = [
  "Patient reports lower back pain for two weeks, pain 6 out of 10.",
  "Starting therapeutic exercise for lumbar stretching and core strengthening.",
  "Continuing therapeutic exercise with resistance band for ten minutes.",
  "Neuromuscular re-education for balance and gait training.",
  "Manual therapy soft tissue mobilization on the lumbar spine.",
  "Applying hot pack to the lower back for fifteen minutes.",
];

interface TranscriptComposerProps {
  mode: LiveMode;
  onModeChange: (mode: LiveMode) => void;
  elapsed: number;
  sending: boolean;
  error: string | null;
  typedLog: string[];
  ambientTranscript?: string;
  ambientInterim?: string;
  speechSupported: boolean;
  speechError: string | null;
  onSend: (
    text: string,
    options?: { advanceMinutes?: number; durationSeconds?: number }
  ) => Promise<boolean>;
}

export function TranscriptComposer({
  mode,
  onModeChange,
  elapsed,
  sending,
  error,
  typedLog,
  ambientTranscript,
  ambientInterim,
  speechSupported,
  speechError,
  onSend,
}: TranscriptComposerProps) {
  const [text, setText] = useState("");
  const [advanceMinutes, setAdvanceMinutes] = useState(4);
  const [demoIndex, setDemoIndex] = useState(0);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || sending) return;
    const ok = await onSend(text, {
      advanceMinutes: mode === "typed" ? advanceMinutes : 0,
      durationSeconds: 60,
    });
    if (ok) setText("");
  };

  const insertDemo = () => {
    const line = DEMO_LINES[demoIndex % DEMO_LINES.length];
    setDemoIndex((i) => i + 1);
    setText(line);
  };

  return (
    <Card className="p-4 rounded-3xl border-medexa-gray-100 bg-white shadow-sm space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "typed" ? "default" : "outline"}
          className={`rounded-full flex-1 h-9 text-xs font-semibold ${
            mode === "typed" ? "bg-medexa-blue text-white" : ""
          }`}
          onClick={() => onModeChange("typed")}
        >
          <Keyboard className="h-3.5 w-3.5 mr-1.5" />
          Type chunks
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "ambient" ? "default" : "outline"}
          className={`rounded-full flex-1 h-9 text-xs font-semibold ${
            mode === "ambient" ? "bg-medexa-blue text-white" : ""
          }`}
          onClick={() => onModeChange("ambient")}
        >
          <Mic className="h-3.5 w-3.5 mr-1.5" />
          Ambient mic
        </Button>
      </div>

      {mode === "typed" ? (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-xs text-medexa-gray-500">
            Paste doctor/patient lines one-by-one. Session clock is at{" "}
            <span className="font-semibold text-medexa-gray-900">{formatElapsed(elapsed)}</span>.
            Path A runs instantly; Path B when enabled; Path C on Stop.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Starting therapeutic exercise for lumbar stretching..."'
            className="min-h-[88px] rounded-2xl bg-medexa-gray-50 border-medexa-gray-200 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-medexa-gray-500 flex items-center gap-2">
              + minutes
              <input
                type="number"
                min={0}
                max={60}
                value={advanceMinutes}
                onChange={(e) => setAdvanceMinutes(Math.max(0, Number(e.target.value) || 0))}
                className="w-14 h-8 rounded-full border border-medexa-gray-200 bg-white px-2 text-sm font-semibold text-medexa-gray-900"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-8 text-xs font-semibold"
              onClick={insertDemo}
            >
              Demo line
            </Button>
            <Button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-full h-8 ml-auto bg-medexa-blue text-white hover:bg-blue-700 text-xs font-semibold"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send chunk
            </Button>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          {typedLog.length > 0 && (
            <div className="max-h-28 overflow-y-auto rounded-2xl bg-medexa-gray-50 p-3 space-y-1">
              {typedLog.slice(-6).map((line, i) => (
                <p key={`${line}-${i}`} className="text-[11px] text-medexa-gray-500 break-words">
                  {line}
                </p>
              ))}
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-medexa-gray-500">
            {speechSupported
              ? "Uses Groq Whisper STT (not browser Web Speech). Resume records ~5s clips → Path A."
              : "Mic not supported here — switch to Type chunks (recommended for Path A/B/C testing)."}
          </p>
          {(ambientTranscript || ambientInterim) && (
            <p className="text-sm italic text-medexa-gray-500 break-words">
              &ldquo;{ambientTranscript} <span className="text-medexa-gray-400">{ambientInterim}</span>&rdquo;
            </p>
          )}
          {speechError && <p className="text-xs text-red-500">{speechError}</p>}
        </div>
      )}
    </Card>
  );
}
