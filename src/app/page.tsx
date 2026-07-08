"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, ArrowUpRight, ChevronRight, ChevronLeft, Loader2, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, StartSessionRequest } from "@/lib/api";

const SAMUEL_PATIENT: StartSessionRequest = {
  patientName: "Samuel Thompson",
  avatar: "https://i.pravatar.cc/150?u=samuel",
  ageSex: "58 / Male",
  weight: "88 kg",
  mrnNumber: "220486",
  payorSource: "Medicare",
  careType: "Chronic Care MGT",
  cpt: "99490",
  icd: "E11.9",
};

export default function Dashboard() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // #region agent log
  useEffect(() => {
    const hasChatCta = typeof document !== "undefined"
      ? !!document.body?.innerText?.includes("Start Doctor & Patient Chat")
      : false;
    fetch("http://127.0.0.1:7430/ingest/6d82ac26-a0b3-4655-94f2-24a638e8e43e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b06e04" },
      body: JSON.stringify({
        sessionId: "b06e04",
        runId: "ui-check-1",
        hypothesisId: "A_B_C",
        location: "page.tsx:Dashboard.mount",
        message: "Dashboard mounted — chat CTA presence",
        data: {
          href: typeof window !== "undefined" ? window.location.href : null,
          host: typeof window !== "undefined" ? window.location.host : null,
          hasChatCta,
          bodySnippet:
            typeof document !== "undefined"
              ? document.body?.innerText?.slice(0, 400)
              : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, []);
  // #endregion

  const handleStartSession = async (patient: StartSessionRequest = SAMUEL_PATIENT) => {
    try {
      setIsStarting(true);
      setStartError(null);
      const res = await api.startSession(patient);
      if (res?.session?.id) {
        // Always open the doctor/patient chat tester (Path A / B / C)
        router.push(`/session/${res.session.id}?mode=chat`);
      } else {
        setStartError("Could not start session. The backend may be starting up — please try again in a moment.");
        setIsStarting(false);
      }
    } catch (e) {
      console.error("Failed to start session", e);
      setStartError("Could not connect to the server. Please check your connection and try again.");
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Big Path A/B/C chat entry — hardest thing to miss */}
      <section>
        <button
          type="button"
          disabled={isStarting}
          onClick={() => handleStartSession()}
          className="w-full text-left rounded-3xl bg-medexa-blue text-white p-5 md:p-7 shadow-[0_12px_40px_rgba(37,99,235,0.28)] hover:bg-blue-700 transition-colors disabled:opacity-70"
        >
          <div className="flex items-start md:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              {isStarting ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <MessageSquareText className="h-7 w-7" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                Path A · Path B · Path C tester
              </p>
              <h2 className="text-xl md:text-2xl font-bold leading-tight">
                {isStarting
                  ? "Opening doctor / patient chat…"
                  : "Start Doctor & Patient Chat"}
              </h2>
              <p className="text-sm text-white/85 mt-1">
                No microphone. Type as therapist and patient live, watch Path A/B suggestions, then Stop for Path C.
              </p>
            </div>
            <ArrowUpRight className="h-6 w-6 shrink-0 opacity-90 hidden sm:block" />
          </div>
        </button>
      </section>

      {/* 1 Screen — greeting + ambient card */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-medexa-gray-500 font-medium text-sm mb-2">Tuesday, Jul 13, 2026</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-medexa-gray-900 leading-tight">
            Good Evening,<br />Dr. Sarah
          </h1>
        </div>

        <div onClick={() => !isStarting && handleStartSession()} className="cursor-pointer group w-full md:w-auto">
          <Card className="p-4 md:p-6 rounded-2xl flex items-center gap-4 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.12)] transition-shadow border-medexa-gray-100 w-full md:min-w-[320px] h-full">
            <div className="h-12 w-12 rounded-full bg-medexa-blue-light flex items-center justify-center text-medexa-blue shrink-0 group-hover:scale-105 transition-transform">
              {isStarting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-medexa-gray-900">
                {isStarting ? "Starting Session..." : "Or start via ambient session"}
              </h3>
              <p className="text-sm text-medexa-gray-500">
                Opens the same live room — chat is on by default (mic optional).
              </p>
            </div>
          </Card>
        </div>
      </section>

      {startError && (
        <Card className="p-4 rounded-2xl border-red-200 bg-red-50 text-red-800 text-sm font-medium">{startError}</Card>
      )}

      {/* Upcoming Sessions — 1 Screen */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-semibold text-medexa-gray-900">Upcoming Sessions</h2>
            <p className="text-sm text-medexa-gray-500">8 sessions remaining ahead</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full font-semibold text-medexa-blue border-medexa-gray-200"
            onClick={() => handleStartSession(SAMUEL_PATIENT)}
          >
            View All Upcoming Sessions <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar">
          <Card
            onClick={() => handleStartSession(SAMUEL_PATIENT)}
            className="min-w-[300px] p-5 rounded-2xl border-medexa-gray-100 shadow-sm relative cursor-pointer hover:border-medexa-blue/20 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarImage src="https://i.pravatar.cc/150?u=samuel" />
                <AvatarFallback>ST</AvatarFallback>
              </Avatar>
              <div className="h-8 w-8 rounded-full bg-medexa-gray-900 flex items-center justify-center text-white">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-medexa-gray-900 mb-2">Samuel Thompson</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-medexa-blue" />
              <span className="text-sm font-medium text-medexa-gray-900">Chronic Care MGT</span>
            </div>
            <p className="text-xs text-medexa-gray-500 mb-4 font-medium tracking-wide">
              CPT: <span className="text-medexa-gray-900">99490</span> &nbsp; ICD: <span className="text-medexa-gray-900">E11.9</span>
            </p>
            <p className="text-sm font-semibold text-medexa-gray-900">
              July 05, <span className="text-medexa-gray-500 font-normal">12:00 PM</span>
            </p>
          </Card>

          <Card className="min-w-[300px] p-5 rounded-2xl border-medexa-gray-100 shadow-sm relative opacity-60">
            <div className="flex justify-between items-start mb-4">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm grayscale">
                <AvatarImage src="https://i.pravatar.cc/150?u=amina" />
                <AvatarFallback>AH</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-medexa-gray-500 bg-medexa-gray-50 px-3 py-1 rounded-full">Awaiting</span>
            </div>
            <h3 className="font-bold text-lg text-medexa-gray-900 mb-2">Amina Hassan</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-medexa-blue" />
              <span className="text-sm font-medium text-medexa-gray-900">Chronic Care MGT</span>
            </div>
            <p className="text-xs text-medexa-gray-500 mb-4 font-medium tracking-wide">
              CPT: <span className="text-medexa-gray-900">99490</span> &nbsp; ICD: <span className="text-medexa-gray-900">E11.9</span>
            </p>
            <p className="text-sm font-semibold text-medexa-gray-900">
              July 05, <span className="text-medexa-gray-500 font-normal">12:00 PM</span>
            </p>
          </Card>

          <Card className="min-w-[300px] p-5 rounded-2xl border-medexa-gray-100 shadow-sm relative opacity-60">
            <div className="flex justify-between items-start mb-4">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm grayscale">
                <AvatarImage src="https://i.pravatar.cc/150?u=robert" />
                <AvatarFallback>RC</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-medexa-gray-500 bg-medexa-gray-50 px-3 py-1 rounded-full">Awaiting</span>
            </div>
            <h3 className="font-bold text-lg text-medexa-gray-900 mb-2">Robert Chen</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-medexa-blue" />
              <span className="text-sm font-medium text-medexa-gray-900">Chronic Care MGT</span>
            </div>
            <p className="text-xs text-medexa-gray-500 mb-4 font-medium tracking-wide">
              CPT: <span className="text-medexa-gray-900">99490</span> &nbsp; ICD: <span className="text-medexa-gray-900">E11.9</span>
            </p>
            <p className="text-sm font-semibold text-medexa-gray-900">
              July 05, <span className="text-medexa-gray-500 font-normal">12:00 PM</span>
            </p>
          </Card>
        </div>
      </section>

      {/* Recent Transcriptions — 1 Screen */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <h2 className="text-xl font-semibold text-medexa-gray-900">Recent Transcriptions</h2>
            <p className="text-sm text-medexa-gray-500">Showing transcriptions from recent sessions</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-medexa-gray-500" />
            <input
              className="w-full rounded-full border border-medexa-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-medexa-blue"
              placeholder="Search transcriptions..."
            />
          </div>
        </div>

        <Card className="rounded-2xl border-medexa-gray-100 shadow-sm overflow-hidden bg-white px-2">
          <div className="divide-y divide-medexa-gray-100">
            {[
              { name: "Jameson Locke", time: "OCT 23, 11:45 AM", status: "SUMMARIZED", statusColor: "text-medexa-green bg-medexa-green/10" },
              { name: "Sarah Palmer", time: "OCT 23, 09:20 AM", status: "SUMMARY PENDING", statusColor: "text-medexa-gray-500 bg-medexa-gray-100" },
              { name: "Michael Chen", time: "OCT 23, 09:45 AM", status: "SUMMARIZED", statusColor: "text-medexa-green bg-medexa-green/10" },
              { name: "Aisha Khan", time: "OCT 23, 10:05 AM", status: "SUMMARY PENDING", statusColor: "text-medexa-gray-500 bg-medexa-gray-100" },
              { name: "David Lopez", time: "OCT 23, 10:30 AM", status: "SUMMARY PENDING", statusColor: "text-medexa-gray-500 bg-medexa-gray-100" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 hover:bg-medexa-gray-50 cursor-default group transition-colors rounded-xl mx-2 my-1 opacity-70"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${item.name.replace(" ", "")}`} />
                    <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-medexa-gray-900">{item.name}</span>
                </div>
                <div className="flex-1 text-center hidden md:block">
                  <span className="text-sm font-medium text-medexa-gray-500 tracking-wide uppercase">{item.time}</span>
                </div>
                <div className="flex items-center justify-end gap-6 flex-1">
                  <Badge variant="secondary" className={`rounded-full px-3 font-bold text-[10px] tracking-wider border-0 ${item.statusColor}`}>
                    {item.status}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-medexa-gray-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-medexa-gray-100 flex justify-center items-center gap-2">
            <Button variant="ghost" size="sm" className="text-medexa-gray-500 text-xs font-semibold uppercase tracking-wider">
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-sm font-semibold rounded-full">1</Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-sm font-semibold rounded-full border-medexa-gray-200">2</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-sm font-semibold rounded-full">3</Button>
              <span className="px-2 flex items-center text-medexa-gray-500">...</span>
            </div>
            <Button variant="ghost" size="sm" className="text-medexa-gray-900 text-xs font-semibold uppercase tracking-wider">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
