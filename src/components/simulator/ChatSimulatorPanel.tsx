"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send, UserRound, Stethoscope, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatElapsed } from "@/lib/api";
import type { ChatMessage, ChatSpeaker } from "@/hooks/useLiveSession";

/** Critical path test script — send in order with Start pressed first. */
const PATH_TEST_SCRIPTS: Record<"US" | "SA" | "AE", Array<{
  speaker: ChatSpeaker;
  text: string;
  expect: string;
}>> = { US: [
  {
    speaker: "patient",
    text: "My lower back hurts when I bend. Pain is 6 out of 10 for two weeks.",
    expect: "Path A: lumbar region entity. Path B may trigger (clinical keywords).",
  },
  {
    speaker: "therapist",
    text: "Starting therapeutic exercise for lumbar stretching and core strengthening.",
    expect: "Path A: CPT 97110 suggestion → click Apply to START billing timer.",
  },
  {
    speaker: "therapist",
    text: "Continuing therapeutic exercise with resistance band for ten minutes.",
    expect: "Path A: no duplicate 97110 suggestion. CPT timer keeps running.",
  },
  {
    speaker: "therapist",
    text: "Now manual therapy soft tissue mobilization on the lumbar spine.",
    expect: "Path A: CPT 97140 suggestion. NCCI conflict vs 97110 → insights banner.",
  },
  {
    speaker: "therapist",
    text: "Neuromuscular re-education for balance and gait training.",
    expect: "Path A: CPT 97112 suggestion while prior units stay recorded.",
  },
], SA: [
  { speaker: "patient", text: "I have five approved physiotherapy visits and this is visit five for right knee pain.", expect: "Path A: approved-session and diagnosis context." },
  { speaker: "therapist", text: "NPHIES pre-authorization SA-AUTH-1001 covers therapeutic exercise for right knee pain.", expect: "Path A: Saudi authorization and service-match checks." },
  { speaker: "therapist", text: "Documenting pain score six out of ten and functional limitation on stairs.", expect: "Path B: documentation guidance; never billing authority." },
], AE: [
  { speaker: "patient", text: "My lower back pain is seven out of ten and limits bending at work.", expect: "Path A: diagnosis and documentation context." },
  { speaker: "therapist", text: "DHA pre-authorization AE-AUTH-1001 is active through eClaimLink for physiotherapy.", expect: "Path A: UAE emirate routing and authorization checks." },
  { speaker: "therapist", text: "Recording functional limitation, medical necessity, and the treatment response.", expect: "Path B assists live; Path C uses this evidence after Stop." },
] };

interface ChatSimulatorPanelProps {
  sending: boolean;
  error: string | null;
  chatMessages: ChatMessage[];
  onSendChat: (speaker: ChatSpeaker, text: string) => Promise<boolean>;
  billingRegion?: "US" | "SA" | "AE";
}

export function ChatSimulatorPanel({
  sending,
  error,
  chatMessages,
  onSendChat,
  billingRegion = "US",
}: ChatSimulatorPanelProps) {
  const pathTestScript = PATH_TEST_SCRIPTS[billingRegion];
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState<ChatSpeaker>("therapist");
  const [scriptIndex, setScriptIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    const currentSpeaker = speaker;
    // Optimistic UI: clear + flip speaker immediately (don't wait on tunnel/Path A).
    setText("");
    setSpeaker(currentSpeaker === "therapist" ? "patient" : "therapist");
    const ok = await onSendChat(currentSpeaker, body);
    if (!ok) {
      // Roll back speaker if send failed.
      setSpeaker(currentSpeaker);
      setText(body);
    }
  };

  const insertNextScriptLine = () => {
    const line = pathTestScript[scriptIndex % pathTestScript.length];
    setScriptIndex((i) => i + 1);
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
            Apply starts the CPT timer. Insights timeline is alerts only — no slide-to-approve.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-8 text-xs font-semibold border-medexa-blue/20 text-medexa-blue hover:bg-medexa-blue/10"
            onClick={() => setShowGuide((v) => !v)}
          >
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            {showGuide ? "Hide" : "Show"} guide
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-8 text-xs font-semibold border-medexa-blue/20 text-medexa-blue hover:bg-medexa-blue/10"
            onClick={insertNextScriptLine}
          >
            Next test line ({(scriptIndex % pathTestScript.length) + 1}/{pathTestScript.length})
          </Button>
        </div>
      </div>

      {showGuide && (
        <div className="rounded-2xl bg-white border border-medexa-gray-100 p-3 text-xs text-medexa-gray-600 space-y-2">
          <p className="font-bold text-medexa-gray-900">How paths work</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Path A</strong> — every message: entities, CPT suggestions (Billing tab), NCCI alerts.
            </li>
            <li>
              <strong>Apply</strong> — starts / switches the active CPT timer; previous CPT time is saved toward units.
            </li>
            <li>
              <strong>Path B</strong> — clinical assistant cards (Clinical tab) after triggers like new activity or gaps.
            </li>
            <li>
              <strong>Path C</strong> — press Stop → SOAP notes &amp; claim review.
            </li>
          </ul>
          {pathTestScript.map((step, i) => (
            <p key={i} className={i === scriptIndex ? "text-medexa-blue font-semibold" : ""}>
              {i + 1}. [{step.speaker}] {step.expect}
            </p>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-64 md:max-h-80 overflow-y-auto rounded-2xl bg-white border border-medexa-gray-100 p-3 space-y-2"
      >
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm font-semibold text-medexa-gray-900 mb-1">Simulator ready</p>
            <p className="text-xs text-medexa-gray-500">
              Press Start, then use &quot;Next test line&quot; or type messages. Timestamps follow the live session clock.
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
                    <span className="text-[10px] ml-auto font-medium tabular-nums">
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
