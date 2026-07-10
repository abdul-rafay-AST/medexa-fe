"use client";

import { UserRound, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatElapsed, ApiDiarizedUtterance } from "@/lib/api";

interface TranscriptComposerProps {
  utterances: ApiDiarizedUtterance[];
  ambientInterim?: string;
  speechSupported: boolean;
  speechError: string | null;
}

export function TranscriptComposer({
  utterances,
  ambientInterim,
  speechSupported,
  speechError,
}: TranscriptComposerProps) {
  return (
    <Card className="p-4 rounded-3xl border-medexa-gray-100 bg-white shadow-sm space-y-3 flex flex-col min-h-[200px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center rounded-full h-9 px-4 text-xs font-semibold bg-medexa-blue text-white">
          Ambient listening
        </div>
        <p className="text-[10px] text-medexa-gray-400 font-medium">
          Speaker roles detected automatically
        </p>
      </div>

      <p className="text-xs text-medexa-gray-500">
        {speechSupported
          ? "Live transcript with patient / therapist labels (~5s clips → Path A)."
          : "Microphone not supported in this browser."}
      </p>

      <div className="flex-1 max-h-72 overflow-y-auto rounded-2xl bg-medexa-gray-50/80 border border-medexa-gray-100 p-3 space-y-2">
        {utterances.length === 0 ? (
          <p className="text-sm text-medexa-gray-400 text-center py-8">
            {ambientInterim || "Listening for speech…"}
          </p>
        ) : (
          utterances.map((msg) => {
            const isTherapist = msg.speaker === "therapist";
            return (
              <div
                key={msg.id}
                className={`flex ${isTherapist ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm ${
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
                    <span className="text-[10px] ml-auto tabular-nums">
                      {formatElapsed(msg.atSeconds)}
                    </span>
                  </div>
                  <p className="text-sm leading-snug break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        {ambientInterim && utterances.length > 0 && (
          <p className="text-xs text-medexa-gray-400 italic text-center">{ambientInterim}</p>
        )}
      </div>

      {speechError && <p className="text-xs text-red-500">{speechError}</p>}
    </Card>
  );
}
