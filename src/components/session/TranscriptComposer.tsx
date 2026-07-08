"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquareText, Mic, Send, UserRound, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatElapsed } from "@/lib/api";
import type { ChatMessage, ChatSpeaker, LiveMode } from "@/hooks/useLiveSession";

const DEMO_EXCHANGE: Array<{ speaker: ChatSpeaker; text: string }> = [
  {
    speaker: "patient",
    text: "My lower back has been hurting for two weeks. Pain is about 6 out of 10 today.",
  },
  {
    speaker: "therapist",
    text: "Understood. Let's start therapeutic exercise for lumbar stretching and core strengthening.",
  },
  {
    speaker: "therapist",
    text: "We'll continue therapeutic exercise with a resistance band for about ten minutes.",
  },
  {
    speaker: "patient",
    text: "Balance feels off when I turn quickly.",
  },
  {
    speaker: "therapist",
    text: "Next is neuromuscular re-education for balance and gait training.",
  },
  {
    speaker: "therapist",
    text: "I'll finish with manual therapy soft tissue mobilization on the lumbar spine.",
  },
];

interface TranscriptComposerProps {
  mode: LiveMode;
  onModeChange: (mode: LiveMode) => void;
  elapsed: number;
  isSessionRunning: boolean;
  hasEverStarted: boolean;
  sending: boolean;
  error: string | null;
  chatMessages: ChatMessage[];
  ambientTranscript?: string;
  ambientInterim?: string;
  speechSupported: boolean;
  speechError: string | null;
  onSendChat: (speaker: ChatSpeaker, text: string) => Promise<boolean>;
}

export function TranscriptComposer({
  mode,
  onModeChange,
  elapsed,
  isSessionRunning,
  hasEverStarted,
  sending,
  error,
  chatMessages,
  ambientTranscript,
  ambientInterim,
  speechSupported,
  speechError,
  onSendChat,
}: TranscriptComposerProps) {
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState<ChatSpeaker>("therapist");
  const [demoIndex, setDemoIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7430/ingest/6d82ac26-a0b3-4655-94f2-24a638e8e43e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b06e04" },
      body: JSON.stringify({
        sessionId: "b06e04",
        runId: "ui-check-1",
        hypothesisId: "D_E",
        location: "TranscriptComposer.tsx:mount",
        message: "TranscriptComposer mounted",
        data: {
          mode,
          href: typeof window !== "undefined" ? window.location.href : null,
          hasSessionChatLabel:
            typeof document !== "undefined"
              ? !!document.body?.innerText?.includes("Session chat")
              : false,
          hasTherapist:
            typeof document !== "undefined"
              ? !!document.body?.innerText?.includes("Therapist")
              : false,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [mode]);
  // #endregion

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || sending) return;
    const ok = await onSendChat(speaker, text);
    if (ok) {
      setText("");
      // Alternate roles to make doctor/patient simulation faster.
      setSpeaker((prev) => (prev === "therapist" ? "patient" : "therapist"));
    }
  };

  const insertDemo = () => {
    const line = DEMO_EXCHANGE[demoIndex % DEMO_EXCHANGE.length];
    setDemoIndex((i) => i + 1);
    setSpeaker(line.speaker);
    setText(line.text);
  };

  return (
    <Card className="p-4 rounded-3xl border-medexa-gray-100 bg-white shadow-sm space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "chat" ? "default" : "outline"}
          className={`rounded-full flex-1 h-9 text-xs font-semibold ${
            mode === "chat" ? "bg-medexa-blue text-white" : ""
          }`}
          onClick={() => onModeChange("chat")}
        >
          <MessageSquareText className="h-3.5 w-3.5 mr-1.5" />
          Session chat
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

      {mode === "chat" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-medexa-gray-500">
              Chat as <span className="font-semibold text-medexa-gray-900">therapist</span> and{" "}
              <span className="font-semibold text-medexa-gray-900">patient</span>. No voice required.
              Timer {isSessionRunning ? "is live" : hasEverStarted ? "is paused" : "starts with Start / first message"}{" "}
              at{" "}
              <span className="font-semibold text-medexa-blue">{formatElapsed(elapsed)}</span>.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-8 text-xs font-semibold"
              onClick={insertDemo}
            >
              Demo line
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="max-h-56 md:max-h-72 overflow-y-auto rounded-2xl bg-medexa-gray-50 border border-medexa-gray-100 p-3 space-y-2"
          >
            {chatMessages.length === 0 ? (
              <p className="text-xs text-medexa-gray-400 text-center py-6 px-3">
                Press <span className="font-semibold">Start</span> below, then send messages as
                Patient / Therapist. Path A billing live; Path B (Bedrock) clinical questions; Path C on Stop.
              </p>
            ) : (
              chatMessages.map((msg) => {
                const isTherapist = msg.speaker === "therapist";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isTherapist ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                        isTherapist
                          ? "bg-medexa-blue text-white rounded-br-md"
                          : "bg-white border border-medexa-gray-200 text-medexa-gray-900 rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-80">
                        {isTherapist ? (
                          <Stethoscope className="h-3 w-3" />
                        ) : (
                          <UserRound className="h-3 w-3" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {isTherapist ? "Therapist" : "Patient"}
                        </span>
                        <span className="text-[10px] ml-auto font-medium">
                          {formatElapsed(msg.atSeconds)}
                        </span>
                      </div>
                      <p className="text-sm leading-snug break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={submit} className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={speaker === "therapist" ? "default" : "outline"}
                className={`rounded-full flex-1 h-9 text-xs font-semibold ${
                  speaker === "therapist" ? "bg-medexa-blue text-white" : ""
                }`}
                onClick={() => setSpeaker("therapist")}
              >
                <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                Therapist
              </Button>
              <Button
                type="button"
                size="sm"
                variant={speaker === "patient" ? "default" : "outline"}
                className={`rounded-full flex-1 h-9 text-xs font-semibold ${
                  speaker === "patient" ? "bg-medexa-gray-900 text-white" : ""
                }`}
                onClick={() => setSpeaker("patient")}
              >
                <UserRound className="h-3.5 w-3.5 mr-1.5" />
                Patient
              </Button>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                speaker === "therapist"
                  ? 'Therapist: "Starting therapeutic exercise…"'
                  : 'Patient: "My lower back hurts when I bend…"'
              }
              className="min-h-[84px] rounded-2xl bg-white border-medexa-gray-200 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />

            <div className="flex items-center gap-2">
              <p className="text-[11px] text-medexa-gray-400">
                Enter to send · Shift+Enter for new line
              </p>
              <Button
                type="submit"
                disabled={sending || !text.trim()}
                className="rounded-full h-9 ml-auto bg-medexa-blue text-white hover:bg-blue-700 text-xs font-semibold px-4"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Send
              </Button>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </form>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-medexa-gray-500">
            {speechSupported
              ? "Ambient STT when configured. Press Start (~5s clips → Path A). Prefer Session chat if STT is off."
              : "Mic not supported here — use Session chat (recommended for Path A/B/C testing)."}
          </p>
          {(ambientTranscript || ambientInterim) && (
            <p className="text-sm italic text-medexa-gray-500 break-words">
              &ldquo;{ambientTranscript}{" "}
              <span className="text-medexa-gray-400">{ambientInterim}</span>&rdquo;
            </p>
          )}
          {speechError && <p className="text-xs text-red-500">{speechError}</p>}
        </div>
      )}
    </Card>
  );
}
