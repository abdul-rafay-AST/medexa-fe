"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, Pause, Play, Square } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InsightsTimeline } from "@/components/session/InsightsTimeline";
import { PipelineStatusBar } from "@/components/session/PipelineStatusBar";
import { SuggestionsPanel } from "@/components/session/SuggestionsPanel";
import { TranscriptComposer } from "@/components/session/TranscriptComposer";
import { EntitiesSidebar } from "@/components/session/EntitiesSidebar";
import { ChatSimulatorPanel } from "@/components/simulator/ChatSimulatorPanel";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useWhisperListening } from "@/hooks/useWhisperListening";
import { api, formatElapsed } from "@/lib/api";

export default function LiveSession() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSimulatorMode = searchParams.get("simulator") === "true";
  const sessionId = params.id as string;
  const [mobilePanel, setMobilePanel] = useState<"insights" | "suggestions">("insights");

  const live = useLiveSession({ sessionId, disableTick: isSimulatorMode });
  const {
    session,
    recordingState,
    insights,
    suggestions,
    assistantSuggestions,
    pipeline,
    loadError,
    elapsed,
    sending,
    lastChunkError,
    chatMessages,
    hasEverStarted,
    isSessionRunning,
    setIsSessionRunning,
    setHasEverStarted,
    refreshLiveData,
    startSessionClock,
    pauseSessionClock,
    sendChatMessage,
    handleAmbientChunk,
  } = live;

  const {
    isListening,
    isSupported,
    isTranscribing,
    error: speechError,
    startListening,
    stopListening,
    transcript,
    lastChunk,
  } = useWhisperListening(sessionId, (chunk) => {
    if (isSimulatorMode) return;
    handleAmbientChunk(chunk).catch(console.error);
  });

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  useEffect(() => {
    if (isSimulatorMode && isListening) stopListening();
  }, [isSimulatorMode, isListening, stopListening]);

  const units = recordingState?.units ?? pipeline?.pathA.units ?? 0;
  const timeLeft = recordingState?.timeLeft ?? 0;
  const nextUnitAt = recordingState?.nextUnitAt ?? elapsed + timeLeft;
  const nextUnitNumber = units + 1;

  const isActive =
    !isSimulatorMode
      ? isListening || isTranscribing
      : isSessionRunning || chatMessages.length > 0 || sending;

  /** Bottom-bar primary control: Start → Pause → Resume */
  const primaryLabel =
    !isSimulatorMode
      ? isListening
        ? "Pause"
        : hasEverStarted
          ? "Resume"
          : "Start"
      : isSessionRunning
        ? "Pause"
        : hasEverStarted
          ? "Resume"
          : "Start";

  const primaryIsPause = primaryLabel === "Pause";

  const handlePrimaryControl = async () => {
    if (isSimulatorMode) {
      if (isSessionRunning) {
        await pauseSessionClock();
      } else {
        await startSessionClock();
      }
      return;
    }

    // Ambient mic mode
    if (isListening) {
      stopListening();
      setIsSessionRunning(false);
      await api.updateState(sessionId, "paused", elapsed);
      await refreshLiveData();
      return;
    }

    setHasEverStarted(true);
    setIsSessionRunning(true);
    await startListening();
    await api.updateState(sessionId, "recording", elapsed);
    await refreshLiveData();
  };

  const handleStop = async () => {
    stopListening();
    setIsSessionRunning(false);
    await api.updateState(sessionId, "stopped", elapsed);

    const chatTranscript = chatMessages
      .map(
        (m) =>
          `${m.speaker === "therapist" ? "Therapist" : "Patient"}: ${m.text}`
      )
      .join("\n");
    const fullTranscript =
      chatTranscript || transcript || "No transcript collected.";
    const activeCode = session?.cpt || pipeline?.pathA.activeCpt || "";
    await api.finalizeSession(sessionId, fullTranscript, elapsed, {
      active: false,
      code: activeCode,
      seconds: elapsed,
      units: units || 1,
    });
    router.push(`/session/${sessionId}/documentation?tab=soap`);
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    await api.applySuggestion(sessionId, suggestionId);
    await refreshLiveData();
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
        <Card className="p-8 max-w-lg rounded-3xl border-medexa-gray-200 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-medexa-gray-900 mb-3">Session unavailable</h1>
          <p className="text-medexa-gray-500 mb-6">{loadError}</p>
          <Link href="/">
            <Button className="rounded-full bg-medexa-blue text-white hover:bg-blue-700">
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center py-24 text-medexa-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-medexa-blue" />
        Loading session...
      </div>
    );
  }

  const timerHint =
    isSimulatorMode
      ? isSessionRunning
        ? "Session chat timer running"
        : hasEverStarted
          ? "Chat paused — tap Resume or send a message"
          : "Tap Start, then chat as patient & therapist"
      : isTranscribing
        ? "Whisper is transcribing…"
        : isListening
          ? "Whisper ambient listening active"
          : isSupported
            ? hasEverStarted
              ? "Tap Resume to continue Whisper listening"
              : "Tap Start to begin Whisper listening"
            : "Use Session chat — mic not available";

  return (
    <div className="flex flex-col gap-4 md:gap-6 relative pb-28 w-full">
      <div className="flex items-start gap-3 md:items-center md:gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-medexa-gray-900 rounded-full shrink-0">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <Avatar className="h-12 w-12 md:h-14 md:w-14 border-2 border-white shadow-sm shrink-0">
          <AvatarImage
            src={session.avatar || `https://i.pravatar.cc/150?u=${session.patientName}`}
          />
          <AvatarFallback>{session.patientName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-8 flex-1 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-medexa-gray-900 truncate">
              {session.patientName}
            </h1>
            <div className="flex flex-wrap gap-4 mt-1 text-sm">
              {session.ageSex && (
                <div>
                  <span className="text-medexa-gray-500 block text-xs">Age / Sex</span>
                  <span className="font-semibold text-medexa-gray-900">{session.ageSex}</span>
                </div>
              )}
              {session.weight && (
                <div>
                  <span className="text-medexa-gray-500 block text-xs">Weight</span>
                  <span className="font-semibold text-medexa-gray-900">{session.weight}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm md:ml-auto md:text-right">
            {session.mrnNumber && (
              <div>
                <span className="text-medexa-gray-500 block text-xs text-left md:text-right">
                  MRN Number
                </span>
                <span className="font-bold text-medexa-gray-900">{session.mrnNumber}</span>
              </div>
            )}
            {session.payorSource && (
              <div>
                <span className="text-medexa-gray-500 block text-xs text-left md:text-right">
                  Payor Source
                </span>
                <span className="font-bold text-medexa-gray-900 flex items-center gap-1 justify-start md:justify-end">
                  <span className="h-2 w-2 rounded-full border-2 border-medexa-blue bg-white" />{" "}
                  {session.payorSource}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <PipelineStatusBar pipeline={pipeline} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-w-0">
        <div className="lg:hidden flex gap-2 w-full min-w-0">
          <Button
            type="button"
            variant={mobilePanel === "insights" ? "default" : "outline"}
            className={`flex-1 rounded-full h-10 text-sm font-semibold ${
              mobilePanel === "insights" ? "bg-medexa-blue text-white" : ""
            }`}
            onClick={() => setMobilePanel("insights")}
          >
            Insights ({insights.length + assistantSuggestions.length})
          </Button>
          <Button
            type="button"
            variant={mobilePanel === "suggestions" ? "default" : "outline"}
            className={`flex-1 rounded-full h-10 text-sm font-semibold ${
              mobilePanel === "suggestions" ? "bg-medexa-blue text-white" : ""
            }`}
            onClick={() => setMobilePanel("suggestions")}
          >
            Suggestions ({suggestions.length})
          </Button>
        </div>

        <div
          className={`lg:col-span-2 flex flex-col gap-4 md:gap-6 min-w-0 ${
            mobilePanel === "suggestions" ? "hidden lg:flex" : "flex"
          }`}
        >
          <Card className="p-4 md:p-6 rounded-3xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-1 h-12 w-12 shrink-0">
                {[4, 8, 6, 12, 10, 5, 8, 4].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full bg-medexa-blue transition-all duration-300 ${
                      isActive ? "animate-pulse" : "opacity-50"
                    }`}
                    style={{ height: `${h * 10}%` }}
                  />
                ))}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-4xl sm:text-5xl font-black text-medexa-gray-900 tracking-tighter tabular-nums drop-shadow-sm">
                    {formatElapsed(elapsed)}
                  </p>
                  <span className="text-sm font-semibold text-medexa-gray-500">
                    / {units || 0} Unit{units === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-sm text-medexa-gray-500 mt-1">{timerHint}</p>
              </div>
            </div>
            
            <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
              {pipeline?.pathA?.activeCpt ? (
                <>
                  <div className="flex items-center gap-1 text-medexa-gray-500 text-sm font-semibold">
                    Unit {nextUnitNumber} at{" "}
                    <span className="text-medexa-gray-900 ml-1">{formatElapsed(nextUnitAt)}</span>
                  </div>
                  <p className="text-sm font-bold text-medexa-blue mt-1">
                    + {formatElapsed(timeLeft)}{" "}
                    <span className="text-medexa-gray-500 font-medium">left</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-medexa-gray-500 text-sm font-semibold">
                    Timer on standby
                  </div>
                  <p className="text-sm font-bold text-medexa-gray-400 mt-1">
                    No active CPT
                  </p>
                </>
              )}
            </div>
          </Card>

          {isSimulatorMode ? (
            <ChatSimulatorPanel
              elapsed={elapsed}
              isSessionRunning={isSessionRunning}
              hasEverStarted={hasEverStarted}
              sending={sending}
              error={lastChunkError}
              chatMessages={chatMessages}
              onSendChat={sendChatMessage}
            />
          ) : (
            <TranscriptComposer
              ambientTranscript={transcript}
              ambientInterim={
                isTranscribing ? " (transcribing…)" : lastChunk ? `Last: ${lastChunk}` : ""
              }
              speechSupported={isSupported}
              speechError={speechError}
            />
          )}

          <InsightsTimeline
            sessionId={sessionId}
            insights={insights}
            assistantSuggestions={assistantSuggestions}
            onChanged={refreshLiveData}
          />
        </div>

        <div
          className={`lg:sticky lg:top-24 lg:self-start min-w-0 flex flex-col gap-4 ${
            mobilePanel === "insights" ? "hidden lg:flex" : "flex"
          }`}
        >
          <SuggestionsPanel
            suggestions={suggestions}
            assistantSuggestions={assistantSuggestions}
            showLiveHighlight={isActive}
            onApply={handleApplySuggestion}
          />
          <EntitiesSidebar entities={pipeline?.entities || []} />
        </div>
      </div>

      <div className="fixed bottom-4 md:bottom-6 left-0 right-0 flex justify-center z-50 px-3 pointer-events-none safe-area-bottom">
        <div className="bg-white rounded-full p-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-medexa-gray-100 flex items-center gap-1 max-w-sm w-full pointer-events-auto">
          <Button
            variant={primaryIsPause ? "ghost" : "default"}
            className={`rounded-full px-3 md:px-4 h-11 font-semibold flex-1 text-sm ${
              primaryIsPause
                ? "text-medexa-blue hover:bg-medexa-blue-light"
                : "bg-medexa-blue text-white hover:bg-blue-700"
            }`}
            onClick={handlePrimaryControl}
          >
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center mr-2 ${
                primaryIsPause ? "bg-medexa-blue-light" : "bg-white/20"
              }`}
            >
              {primaryIsPause ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </div>
            {primaryLabel}
          </Button>
          <div className="w-px h-8 bg-medexa-gray-200" />
          <Button
            onClick={handleStop}
            variant="ghost"
            className="rounded-full px-3 md:px-4 h-11 font-semibold text-medexa-gray-900 hover:bg-medexa-gray-50 flex-1 text-sm"
          >
            <div className="h-7 w-7 rounded-full bg-medexa-blue text-white flex items-center justify-center mr-2">
              <Square className="h-3 w-3 fill-current" />
            </div>
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}
