"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Pause, Square, Check, X,  Play, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  api,
  ApiInsight,
  ApiRecordingState,
  ApiSession,
  ApiSuggestion,
  formatElapsed,
} from "@/lib/api";
import { SwipeToApprove } from "@/components/ui/swipe-to-approve";

export default function LiveSession() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<ApiSession | null>(null);
  const [recordingState, setRecordingState] = useState<ApiRecordingState | null>(null);
  const [insights, setInsights] = useState<ApiInsight[]>([]);
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [mobilePanel, setMobilePanel] = useState<"insights" | "suggestions">("insights");

  const refreshLiveData = useCallback(async () => {
    const [sessionData, state, resInsights, resSuggestions] = await Promise.all([
      api.getSession(sessionId),
      api.getState(sessionId),
      api.getInsights(sessionId),
      api.getSuggestions(sessionId),
    ]);

    if (!sessionData) {
      setLoadError(
        sessionId === "1"
          ? "This demo link is static. Go back and click Start a new session."
          : "Session not found. Start a new session from the dashboard."
      );
      return;
    }

    setLoadError(null);
    setSession(sessionData);
    if (state) setRecordingState(state);
    if (resInsights) setInsights(resInsights);
    if (resSuggestions) setSuggestions(resSuggestions);
  }, [sessionId]);

  const handleTranscriptChunk = useCallback(
    async (chunk: string) => {
      if (!chunk.trim() || !sessionId || loadError) return;
      await api.analyzeTranscriptChunk(sessionId, chunk);
      await refreshLiveData();
    },
    [sessionId, loadError, refreshLiveData]
  );

  const {
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
  } = useSpeechRecognition((chunk) => {
    handleTranscriptChunk(chunk).catch(console.error);
  });

  // Sync elapsed with recordingState, but preserve/progress our local ticking
  useEffect(() => {
    if (recordingState) {
      setElapsed((prev) => {
        if (isListening) {
          return Math.max(prev, recordingState.elapsedSeconds);
        }
        return recordingState.elapsedSeconds;
      });
    }
  }, [recordingState, isListening]);

  // Smooth local timer increment when recording/listening
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isListening) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  useEffect(() => {
    refreshLiveData();
    const interval = setInterval(refreshLiveData, 2000);
    return () => clearInterval(interval);
  }, [refreshLiveData]);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  const startRecording = async (currentElapsed: number) => {
    startListening();
    const state = await api.updateState(sessionId, "recording", currentElapsed);
    if (state) setRecordingState(state);
  };

  const toggleRecording = async () => {
    if (isListening) {
      stopListening();
      const state = await api.updateState(sessionId, "paused", elapsed);
      if (state) setRecordingState(state);
    } else {
      await startRecording(elapsed);
    }
  };

  const handleStop = async () => {
    stopListening();
    const activeCode = session?.cpt || "";
    const finalizeRes = await api.finalizeSession(
      sessionId,
      transcript || "No transcript collected.",
      elapsed,
      { active: false, code: activeCode, seconds: elapsed, units: units || 1 }
    );
    if (finalizeRes) {
      router.push(`/session/${sessionId}/documentation?tab=soap`);
    } else {
      await api.updateState(sessionId, "stopped", elapsed);
      router.push(`/session/${sessionId}/documentation?tab=soap`);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    await api.applySuggestion(sessionId, suggestionId);
    await refreshLiveData();
  };

  const units = recordingState?.units ?? 0;
  const timeLeft = recordingState?.timeLeft ?? 0;
  const nextUnitAt = recordingState?.nextUnitAt ?? 0;
  const nextUnitNumber = units + 1;

  const appliedSuggestions = suggestions.filter((s) => s.applied);
  const pendingSuggestions = suggestions.filter((s) => !s.applied);
  const liveCptSuggestion = isListening ? pendingSuggestions[0] : null;
  const queueSuggestions = isListening ? pendingSuggestions.slice(1) : pendingSuggestions;

  const formatDetectedLine = (insight: ApiInsight) => {
    if (insight.type === "billing") return insight.question;
    return insight.question || insight.description;
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
        <Card className="p-8 max-w-lg rounded-3xl border-medexa-gray-200 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-medexa-gray-900 mb-3">Session unavailable</h1>
          <p className="text-medexa-gray-500 mb-6">{loadError}</p>
          <Link href="/">
            <Button className="rounded-full bg-medexa-blue text-white hover:bg-blue-700">Back to Dashboard</Button>
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
    <div className="flex flex-col gap-6 relative pb-24 w-full px-4 md:px-0">
      {/* Patient header — 2 Screen */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-medexa-gray-900 rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
          <AvatarImage src={session.avatar || `https://i.pravatar.cc/150?u=${session.patientName}`} />
          <AvatarFallback>{session.patientName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-8 flex-1">
          <div>
            <h1 className="text-2xl font-bold text-medexa-gray-900">{session.patientName}</h1>
            <div className="flex gap-6 mt-1 text-sm">
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
          <div className="flex flex-wrap gap-4 text-sm md:ml-auto md:text-right mt-2 md:mt-0">
            {session.mrnNumber && (
              <div>
                <span className="text-medexa-gray-500 block text-xs text-left md:text-right">MRN Number</span>
                <span className="font-bold text-medexa-gray-900">{session.mrnNumber}</span>
              </div>
            )}
            {session.payorSource && (
              <div>
                <span className="text-medexa-gray-500 block text-xs text-left md:text-right">Payor Source</span>
                <span className="font-bold text-medexa-gray-900 flex items-center gap-1 justify-start md:justify-end">
                  <span className="h-2 w-2 rounded-full border-2 border-medexa-blue bg-white"></span> {session.payorSource}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Mobile: switch between Insights and Suggestions (proto screen 2) */}
        <div className="lg:hidden flex gap-2 w-full min-w-0">
          <Button
            type="button"
            variant={mobilePanel === "insights" ? "default" : "outline"}
            className={`flex-1 rounded-full h-10 text-sm font-semibold ${mobilePanel === "insights" ? "bg-medexa-blue text-white" : ""}`}
            onClick={() => setMobilePanel("insights")}
          >
            Insights ({insights.length})
          </Button>
          <Button
            type="button"
            variant={mobilePanel === "suggestions" ? "default" : "outline"}
            className={`flex-1 rounded-full h-10 text-sm font-semibold ${mobilePanel === "suggestions" ? "bg-medexa-blue text-white" : ""}`}
            onClick={() => setMobilePanel("suggestions")}
          >
            Suggestions ({suggestions.length})
          </Button>
        </div>

        <div className={`lg:col-span-2 flex flex-col gap-6 min-w-0 ${mobilePanel === "suggestions" ? "hidden lg:flex" : "flex"}`}>
          {/* Recording bar */}
          <Card
            className="p-4 md:p-6 rounded-3xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
            onClick={() => !isListening && isSupported && startRecording(elapsed)}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 h-12 w-12 shrink-0">
                {[4, 8, 6, 12, 10, 5, 8, 4].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full bg-medexa-blue transition-all duration-300 ${isListening ? "animate-pulse" : "opacity-50"}`}
                    style={{ height: `${h * 10}%` }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold text-medexa-blue tracking-tight">{formatElapsed(elapsed)}</span>
                  <span className="text-sm font-semibold text-medexa-gray-500">/ {units || 1} Unit{units === 1 ? "" : "s"}</span>
                </div>
                <p className="text-sm text-medexa-gray-500 mt-1">
                  {isListening ? (
                    <>Say <span className="font-bold text-medexa-gray-900">Pause</span> Recording..</>
                  ) : isSupported ? (
                    <>Tap to <span className="font-bold text-medexa-gray-900">Start</span> Recording</>
                  ) : (
                    "Use Chrome or Edge for voice capture"
                  )}
                </p>
                {speechError && <p className="text-xs text-red-500 mt-1">{speechError}</p>}
              </div>
            </div>
            <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
              <div className="flex items-center gap-1 text-medexa-gray-500 text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Unit {nextUnitNumber} at <span className="text-medexa-gray-900 ml-1">{formatElapsed(nextUnitAt)}</span>
              </div>
              <p className="text-sm font-bold text-medexa-blue mt-1">
                + {formatElapsed(timeLeft)} <span className="text-medexa-gray-500 font-medium">left</span>
              </p>
            </div>
          </Card>

          {(transcript || interimTranscript) && (
            <div className="px-4 py-2 italic text-sm text-medexa-gray-500 break-words">
              &ldquo;{transcript} <span className="text-medexa-gray-400">{interimTranscript}</span>&rdquo;
            </div>
          )}

          {/* Insights timeline — Figma screen 2 */}
          <div className="relative mt-2 min-w-0">
            <div className="absolute left-[15px] top-3 bottom-0 border-l-2 border-dashed border-medexa-blue/25 hidden sm:block" />
            <p className="text-sm text-medexa-gray-500 mb-4 pl-2">Medexa is Processing for Insights...</p>
            <div className="flex flex-col gap-5 relative pl-0 sm:pl-8">
              {insights.map((insight, idx) => (
                <div key={insight.id || idx} className="relative">
                  <span
                    data-insight-dot
                    className="hidden sm:block absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full bg-medexa-blue ring-4 ring-medexa-gray-50 z-10"
                  />
                  {insight.type === "protocol" ? (
                    <Card className="p-4 rounded-2xl border-l-4 border-l-medexa-green border border-medexa-gray-100 shadow-[0_8px_24px_rgba(16,185,129,0.08)] bg-white">
                      <Badge className="bg-medexa-blue hover:bg-medexa-blue text-white rounded-full px-3 mb-2 font-semibold tracking-wide">
                        {insight.label || "Protocol Ask"}
                      </Badge>
                      <p className="font-medium text-medexa-gray-900 break-words">&ldquo;{insight.question}&rdquo;</p>
                    </Card>
                  ) : (
                    <Card className="p-4 rounded-2xl border border-medexa-gray-100 shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="rounded-full px-3 font-semibold text-medexa-gray-500 border-medexa-gray-200 capitalize text-xs">
                          {insight.type === "billing" ? "Billing" : insight.label || "Detected"}
                        </Badge>
                        {insight.status === "pending" && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-medexa-gray-400 flex items-center gap-1 hover:text-red-500 transition-colors"
                            onClick={() => api.ignoreInsight(sessionId, insight.id).then(refreshLiveData)}
                          >
                            <X className="h-3 w-3" /> Ignore
                          </button>
                        )}
                      </div>
                      <p className="font-semibold text-medexa-gray-900 text-sm break-words">{formatDetectedLine(insight)}</p>
                      {insight.description && insight.type === "detected" && (
                        <p className="text-xs text-medexa-gray-500 mt-1 break-words">{insight.description}</p>
                      )}
                      {insight.status === "pending" && (
                        <SwipeToApprove onApprove={() => api.approveInsight(sessionId, insight.id || "").then(refreshLiveData)} />
                      )}
                      {insight.status === "approved" && (
                        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-medexa-green">
                          <Check className="h-4 w-4" /> Approved
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              ))}
              {insights.length === 0 && (
                <div className="text-sm text-medexa-gray-400 pl-2">
                  Start recording and describe the session — insights will appear here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions panel — Figma screen 2 */}
        <div className={`lg:sticky lg:top-24 lg:self-start min-w-0 ${mobilePanel === "insights" ? "hidden lg:block" : "block"}`}>
          <Card className="p-4 md:p-6 rounded-3xl bg-white shadow-sm border-medexa-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-medexa-gray-900">Suggestions</h2>
              <span className="h-6 w-6 rounded-full bg-medexa-blue text-white text-xs flex items-center justify-center font-bold">{suggestions.length}</span>
            </div>
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {liveCptSuggestion && (
                <Card className="p-4 rounded-2xl bg-white border border-medexa-gray-200 shadow-sm">
                  <p className="text-xs font-semibold text-medexa-gray-500 mb-2">Current Live CPT</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-medexa-green animate-pulse shrink-0" />
                    <Badge className="bg-medexa-gray-900 text-white rounded-full px-3 py-0.5 text-xs font-bold hover:bg-medexa-gray-900 max-w-full truncate">
                      {liveCptSuggestion.title}
                    </Badge>
                  </div>
                  <p className="text-sm text-medexa-gray-900 font-medium break-words">{liveCptSuggestion.text}</p>
                </Card>
              )}

              {appliedSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="p-4 rounded-2xl bg-white border border-medexa-gray-200 shadow-sm">
                  <p className="text-xs font-semibold text-medexa-gray-500 mb-2">Unit Recorded</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-medexa-green shrink-0" />
                    <Badge className="bg-medexa-gray-900 text-white rounded-full px-3 py-0.5 text-xs font-bold hover:bg-medexa-gray-900 max-w-full truncate">
                      {suggestion.title}
                    </Badge>
                  </div>
                  <p className="text-sm text-medexa-gray-900 font-medium break-words">{suggestion.text}</p>
                </Card>
              ))}

              {queueSuggestions.map((suggestion) => {
                const isModifier = /modifier|ncci|bundle/i.test(suggestion.title + suggestion.text);
                return (
                  <Card key={suggestion.id} className="p-4 rounded-2xl bg-white border border-medexa-gray-200 shadow-sm relative">
                    <Badge
                      className={`rounded-full px-3 py-0.5 text-xs font-bold mb-2 max-w-full truncate ${
                        isModifier ? "bg-medexa-gray-900 text-white hover:bg-medexa-gray-900" : "bg-medexa-blue/10 text-medexa-blue hover:bg-medexa-blue/10"
                      }`}
                    >
                      {suggestion.title}
                    </Badge>
                    <p className="text-sm text-medexa-gray-900 mb-3 font-medium break-words">{suggestion.text}</p>
                    <div className="flex justify-end border-t border-medexa-gray-100 pt-2">
                      <Button
                        variant="ghost"
                        className="text-medexa-blue font-bold tracking-wide flex items-center gap-2 h-8 px-2 hover:bg-transparent hover:text-medexa-blue text-sm"
                        onClick={() => handleApplySuggestion(suggestion.id)}
                      >
                        <Check className="h-4 w-4" /> Apply
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {suggestions.length === 0 && (
                <div className="text-sm text-medexa-gray-400">No suggestions yet. Start speaking to see AI suggestions.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Floating action bar — constrained width for mobile */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
        <div className="bg-white rounded-full p-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-medexa-gray-100 flex items-center gap-1 max-w-xs w-full pointer-events-auto">
          <Button
            variant={isListening ? "ghost" : "default"}
            className={`rounded-full px-4 h-11 font-semibold flex-1 ${isListening ? "text-medexa-blue hover:bg-medexa-blue-light" : "bg-medexa-blue text-white hover:bg-blue-700"}`}
            onClick={toggleRecording}
          >
            <div className={`h-7 w-7 rounded-full flex items-center justify-center mr-2 ${isListening ? "bg-medexa-blue-light" : "bg-white/20"}`}>
              {isListening ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </div>
            {isListening ? "Pause" : "Resume"}
          </Button>
          <div className="w-px h-8 bg-medexa-gray-200"></div>
          <Button onClick={handleStop} variant="ghost" className="rounded-full px-4 h-11 font-semibold text-medexa-gray-900 hover:bg-medexa-gray-50 flex-1">
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
