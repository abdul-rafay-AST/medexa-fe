"use client";

import { Card } from "@/components/ui/card";
import { Mic } from "lucide-react";

interface TranscriptComposerProps {
  ambientTranscript?: string;
  ambientInterim?: string;
  speechSupported: boolean;
  speechError: string | null;
}

export function TranscriptComposer({
  ambientTranscript,
  ambientInterim,
  speechSupported,
  speechError,
}: TranscriptComposerProps) {
  return (
    <Card className="p-4 rounded-3xl border-medexa-gray-100 bg-white shadow-sm space-y-3">
      <div className="flex gap-2">
        <div className="flex items-center rounded-full h-9 px-4 text-xs font-semibold bg-medexa-blue text-white w-full max-w-[200px]">
          <Mic className="h-3.5 w-3.5 mr-1.5" />
          Ambient mic
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-medexa-gray-500">
          {speechSupported
            ? "Uses Groq Whisper STT. Press Start to begin ambient listening (~5s audio clips → Path A)."
            : "Mic not supported here."}
        </p>
        {(ambientTranscript || ambientInterim) && (
          <p className="text-sm italic text-medexa-gray-500 break-words">
            &ldquo;{ambientTranscript}{" "}
            <span className="text-medexa-gray-400">{ambientInterim}</span>&rdquo;
          </p>
        )}
        {speechError && <p className="text-xs text-red-500">{speechError}</p>}
      </div>
    </Card>
  );
}
