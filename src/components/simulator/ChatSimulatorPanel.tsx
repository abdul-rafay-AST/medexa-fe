"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send, UserRound, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatElapsed } from "@/lib/api";
import type { ChatMessage, ChatSpeaker } from "@/hooks/useLiveSession";

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

interface ChatSimulatorPanelProps {
  elapsed: number;
  isSessionRunning: boolean;
  hasEverStarted: boolean;
  sending: boolean;
  error: string | null;
  chatMessages: ChatMessage[];
  onSendChat: (speaker: ChatSpeaker, text: string) => Promise<boolean>;
}

export function ChatSimulatorPanel({
  elapsed,
  isSessionRunning,
  hasEverStarted,
  sending,
  error,
  chatMessages,
  onSendChat,
}: ChatSimulatorPanelProps) {
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState<ChatSpeaker>("therapist");
  const [demoIndex, setDemoIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || sending) return;
    const ok = await onSendChat(speaker, text);
    if (ok) {
      setText("");
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
    <Card className="p-4 rounded-3xl border-medexa-blue/20 bg-medexa-blue/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-medexa-blue/10">
        <div>
          <h2 className="font-bold text-medexa-blue text-lg flex items-center gap-2">
            Chat Simulator
          </h2>
          <p className="text-xs text-medexa-gray-500 mt-1">
            Test Path A/B/C pipelines by simulating a clinical conversation.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full h-8 text-xs font-semibold border-medexa-blue/20 text-medexa-blue hover:bg-medexa-blue/10"
          onClick={insertDemo}
        >
          Insert Demo Line
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-64 md:max-h-80 overflow-y-auto rounded-2xl bg-white border border-medexa-gray-100 p-3 space-y-2"
      >
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm font-semibold text-medexa-gray-900 mb-1">
              Simulator Ready
            </p>
            <p className="text-xs text-medexa-gray-500">
              Press Start below, then send messages as Patient / Therapist.
              <br />Path A rules update live; Path B triggers intelligently.
            </p>
          </div>
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
                      : "bg-medexa-gray-50 border border-medexa-gray-200 text-medexa-gray-900 rounded-bl-md"
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

      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={speaker === "therapist" ? "default" : "outline"}
            className={`rounded-full flex-1 h-10 text-sm font-semibold ${
              speaker === "therapist" ? "bg-medexa-blue text-white border-transparent" : "bg-white border-medexa-gray-200"
            }`}
            onClick={() => setSpeaker("therapist")}
          >
            <Stethoscope className="h-4 w-4 mr-2" />
            Therapist
          </Button>
          <Button
            type="button"
            size="sm"
            variant={speaker === "patient" ? "default" : "outline"}
            className={`rounded-full flex-1 h-10 text-sm font-semibold ${
              speaker === "patient" ? "bg-medexa-gray-900 text-white border-transparent" : "bg-white border-medexa-gray-200"
            }`}
            onClick={() => setSpeaker("patient")}
          >
            <UserRound className="h-4 w-4 mr-2" />
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
          className="min-h-[100px] rounded-2xl bg-white border-medexa-gray-200 text-sm p-3 focus-visible:ring-medexa-blue"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />

        <div className="flex items-center gap-2">
          <p className="text-xs text-medexa-gray-400 font-medium">
            Enter to send · Shift+Enter for new line
          </p>
          <Button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-full h-10 ml-auto bg-medexa-blue text-white hover:bg-blue-700 text-sm font-semibold px-6 shadow-sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Message
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 font-bold mt-2 bg-red-50 p-2 rounded-lg">{error}</p>}
      </form>
    </Card>
  );
}
