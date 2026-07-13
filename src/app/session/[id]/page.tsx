"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { ChatSimulatorPanel } from "@/components/simulator/ChatSimulatorPanel";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useWhisperListening } from "@/hooks/useWhisperListening";
import { api, formatElapsed } from "@/lib/api";
import { AMBIENT_AUTOSTART_KEY } from "@/lib/micPermission";

export default function LiveSession() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSimulatorMode = searchParams.get("simulator") === "true";
  const sessionId = params.id as string;
  const [mobilePanel, setMobilePanel] = useState<"insights" | "assistant">("insights");
  const [ambientPausedByUser, setAmbientPausedByUser] = useState(false);
  const [isBootstrappingMic, setIsBootstrappingMic] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const micStartInFlightRef = useRef(false);
  const getElapsedRef = useRef<() => number>(() => 0);

  const live = useLiveSession({ sessionId });
  getElapsedRef.current = live.getWallClockElapsed;
  const {
    session,
    recordingState,
    insights,
    suggestions,
    assistantSuggestions,
    pipeline,
    loadError,
    elapsed,
    billingElapsed,
    cptElapsed,
    timeLeft,
    activeCptCode,
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
    handleAmbientTranscribed,
    applySuggestion,
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
    utterances,
    syncUtterances,
  } = useWhisperListening(
    sessionId,
    () => {
      if (isSimulatorMode) return;
      handleAmbientTranscribed().catch(console.error);
    },
    () => getElapsedRef.current()
  );

  useEffect(() => {
    return () => stopListening();
    // Only tear down mic when leaving this session route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (isSimulatorMode && isListening) stopListening();
  }, [isSimulatorMode, isListening, stopListening]);

  const startAmbientSession = useCallback(async (): Promise<boolean> => {
    setHasEverStarted(true);
    setAmbientPausedByUser(false);
    setMicBlocked(false);
    if (!isSessionRunning) {
      await startSessionClock();
    }
    const ok = await startListening();
    if (ok) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(AMBIENT_AUTOSTART_KEY);
      }
      await refreshLiveData();
    } else {
      setMicBlocked(true);
    }
    return ok;
  }, [isSessionRunning, refreshLiveData, setHasEverStarted, startListening, startSessionClock]);

  /** Ambient: start mic as soon as the session page is ready. */
  useEffect(() => {
    if (isSimulatorMode || loadError || !session || !isSupported) return;
    if (isListening || ambientPausedByUser || micBlocked) return;
    if (micStartInFlightRef.current) return;

    micStartInFlightRef.current = true;
    setIsBootstrappingMic(true);

    void startAmbientSession().finally(() => {
      micStartInFlightRef.current = false;
      setIsBootstrappingMic(false);
    });
  }, [
    isSimulatorMode,
    loadError,
    session,
    isSupported,
    isListening,
    ambientPausedByUser,
    micBlocked,
    startAmbientSession,
  ]);

  useEffect(() => {
    if (pipeline?.diarizedUtterances?.length) {
      syncUtterances(pipeline.diarizedUtterances);
    }
  }, [pipeline?.diarizedUtterances, syncUtterances]);

  const units = recordingState?.units ?? pipeline?.pathA.units ?? 0;
  const totalBillingElapsed = billingElapsed;
  const activeCptSeconds = cptElapsed;
  const hasActiveCpt = Boolean(activeCptCode ?? pipeline?.pathA?.activeCpt);
  const actualTimeLeft = timeLeft;
  const nextUnitNumber = units + 1;
  const activeCptLabel =
    pipeline?.pathA.cptDisplayName ?? pipeline?.pathA.activeCpt ?? activeCptCode ?? null;
  const showSessionTimer = hasEverStarted || isSessionRunning || elapsed > 0;
  const pendingBillingInsights = insights.filter(
    (i) => i.type === "billing" && i.status === "pending"
  );
  const modifierInsight = pendingBillingInsights.find((i) =>
    /modifier\s*59/i.test(i.question + i.description)
  );

  const isActive =
    !isSimulatorMode
      ? isListening || isTranscribing || isBootstrappingMic
      : isSessionRunning || chatMessages.length > 0 || sending;

  /** Ambient: Pause while live; Listen only after user explicitly paused. No Resume/Start. */
  const primaryLabel = isSimulatorMode
    ? isSessionRunning
      ? "Pause"
      : hasEverStarted
        ? "Resume"
        : "Start"
    : isListening
      ? "Pause"
      : ambientPausedByUser || micBlocked
        ? "Listen"
        : "Listening…";

  const primaryIsPause = !isSimulatorMode && isListening;
  const primaryDisabled =
    !isSimulatorMode && isBootstrappingMic && !isListening && !ambientPausedByUser && !micBlocked;

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
      setAmbientPausedByUser(true);
      await pauseSessionClock();
      await refreshLiveData();
      return;
    }

    setIsBootstrappingMic(true);
    const ok = await startAmbientSession();
    setIsBootstrappingMic(false);
    if (!ok) setMicBlocked(true);
  };

  const handleStop = async () => {
    if (isFinalizing) return;
    setIsFinalizing(true);
    setFinalizeError(null);
    stopListening();
    setIsSessionRunning(false);
    const state = await api.updateState(sessionId, "stopped", elapsed);
    if (!state) {
      setFinalizeError("Could not stop the session. Please retry.");
      setIsFinalizing(false);
      return;
    }

    const chatTranscript = chatMessages
      .map(
        (m) =>
          `${m.speaker === "therapist" ? "Therapist" : "Patient"}: ${m.text}`
      )
      .join("\n");
    const fullTranscript =
      chatTranscript ||
      transcript ||
      pipeline?.transcriptPreview ||
      "";
    const activeCode = session?.cpt || pipeline?.pathA.activeCpt || "";
    const finalized = await api.finalizeSession(sessionId, fullTranscript, elapsed, {
      active: false,
      code: activeCode,
      seconds: elapsed,
      units: units || 1,
    });
    if (!finalized) {
      setFinalizeError("Path C could not generate the documentation. Your session is saved; please retry.");
      setIsFinalizing(false);
      return;
    }
    router.push(`/session/${sessionId}/documentation?tab=soap`);
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    await applySuggestion(suggestionId);
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

      {modifierInsight && (
        <Card className="p-4 rounded-2xl border-l-4 border-l-amber-500 bg-amber-50 border-amber-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">
            NCCI Billing Alert
          </p>
          <p className="font-semibold text-amber-950 text-sm">{modifierInsight.question}</p>
          <p className="text-sm text-amber-900 mt-1">{modifierInsight.description}</p>
        </Card>
      )}

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
            Insights ({insights.length})
          </Button>
          <Button
            type="button"
            variant={mobilePanel === "assistant" ? "default" : "outline"}
            className={`flex-1 rounded-full h-10 text-sm font-semibold ${
              mobilePanel === "assistant" ? "bg-medexa-blue text-white" : ""
            }`}
            onClick={() => setMobilePanel("assistant")}
          >
            Assistant ({suggestions.length + (pipeline?.entities?.length ?? 0)})
          </Button>
        </div>

        <div
          className={`lg:col-span-2 flex flex-col gap-4 md:gap-6 min-w-0 ${
            mobilePanel === "assistant" ? "hidden lg:flex" : "flex"
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
                <p className="text-4xl sm:text-5xl font-black text-medexa-gray-900 tracking-tighter tabular-nums drop-shadow-sm">
                  {formatElapsed(showSessionTimer ? elapsed : 0)}
                </p>
                <p className="text-sm text-medexa-gray-500 mt-1">
                  {isListening || isBootstrappingMic
                    ? "Listening…"
                    : ambientPausedByUser
                      ? "Paused"
                      : isSessionRunning
                        ? "Session time"
                        : "Session time"}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0 min-w-[200px]">
              {hasActiveCpt ? (
                <>
                  <p className="text-sm font-semibold text-medexa-gray-900 truncate max-w-[220px]">
                    {activeCptLabel ?? "Active CPT"}
                  </p>
                  <p className="text-sm font-bold text-medexa-blue mt-1 tabular-nums">
                    CPT {formatElapsed(activeCptSeconds)}
                    <span className="text-medexa-gray-500 font-medium"> · timed </span>
                    {formatElapsed(totalBillingElapsed)}
                    <span className="text-medexa-gray-500 font-medium"> · </span>
                    {units} unit{units === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs font-semibold text-medexa-gray-500 mt-1 tabular-nums">
                    {formatElapsed(actualTimeLeft)} until unit {nextUnitNumber}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-medexa-gray-500">
                    {isSessionRunning ? "Awaiting CPT" : "Billing standby"}
                  </p>
                  <p className="text-xs text-medexa-gray-400 mt-1 tabular-nums">
                    {isSessionRunning
                      ? "Session running — apply a CPT to start billing"
                      : "Start session, then apply a CPT suggestion"}
                  </p>
                  {units > 0 && (
                    <p className="text-xs font-semibold text-medexa-blue mt-1 tabular-nums">
                      {units} unit{units === 1 ? "" : "s"} billed
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>

          {isSimulatorMode ? (
            <ChatSimulatorPanel
              billingRegion={session.billingRegion}
              sending={sending}
              error={lastChunkError}
              chatMessages={chatMessages}
              onSendChat={sendChatMessage}
            />
          ) : (
            <TranscriptComposer
              utterances={utterances}
              ambientInterim={
                isTranscribing ? "Transcribing…" : lastChunk ? `Last: ${lastChunk}` : undefined
              }
              speechSupported={isSupported}
              speechError={speechError}
            />
          )}

          <InsightsTimeline
            sessionId={sessionId}
            insights={insights}
            onChanged={refreshLiveData}
          />
        </div>

        <div
          className={`lg:sticky lg:top-24 lg:self-start min-w-0 flex flex-col h-[calc(100vh-140px)] min-h-0 ${
            mobilePanel === "insights" ? "hidden lg:flex" : "flex"
          }`}
        >
          <SuggestionsPanel
            suggestions={suggestions}
            assistantSuggestions={assistantSuggestions}
            entities={pipeline?.entities || []}
            showLiveHighlight={isActive}
            onApply={handleApplySuggestion}
          />
        </div>
      </div>

      <div className="fixed bottom-4 md:bottom-6 left-0 right-0 flex justify-center z-50 px-3 pointer-events-none safe-area-bottom">
        <div className="bg-white rounded-full p-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-medexa-gray-100 flex items-center gap-1 max-w-sm w-full pointer-events-auto">
          <Button
            variant={primaryIsPause ? "ghost" : "default"}
            disabled={primaryDisabled}
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
              ) : primaryDisabled ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </div>
            {primaryLabel}
          </Button>
          <div className="w-px h-8 bg-medexa-gray-200" />
          <Button
            onClick={handleStop}
            disabled={isFinalizing}
            variant="ghost"
            className="rounded-full px-3 md:px-4 h-11 font-semibold text-medexa-gray-900 hover:bg-medexa-gray-50 flex-1 text-sm"
          >
            <div className="h-7 w-7 rounded-full bg-medexa-blue text-white flex items-center justify-center mr-2">
              {isFinalizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3 fill-current" />}
            </div>
            {isFinalizing ? "Finalizing" : "Stop"}
          </Button>
        </div>
      </div>
      {finalizeError && (
        <div className="fixed bottom-20 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 shadow-lg">
          {finalizeError}
        </div>
      )}
    </div>
  );
}
