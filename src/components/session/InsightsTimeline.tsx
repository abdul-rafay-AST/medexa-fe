"use client";

import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SwipeToApprove } from "@/components/ui/swipe-to-approve";
import { api, ApiAssistantSuggestion, ApiInsight } from "@/lib/api";

interface InsightsTimelineProps {
  sessionId: string;
  insights: ApiInsight[];
  assistantSuggestions: ApiAssistantSuggestion[];
  onChanged: () => Promise<void>;
}

export function InsightsTimeline({
  sessionId,
  insights,
  assistantSuggestions,
  onChanged,
}: InsightsTimelineProps) {
  const formatDetectedLine = (insight: ApiInsight) => {
    if (insight.type === "billing") return insight.question;
    return insight.question || insight.description;
  };

  return (
    <div className="relative mt-1 min-w-0">
      <div className="absolute left-[15px] top-3 bottom-0 border-l-2 border-dashed border-medexa-blue/25 hidden sm:block" />
      <p className="text-sm text-medexa-gray-500 mb-4 pl-1 sm:pl-2">
        Medexa is Processing for Insights...
      </p>
      <div className="flex flex-col gap-5 relative pl-0 sm:pl-8">
        {insights.map((insight, idx) => (
          <div key={insight.id || idx} className="relative">
            <span className="hidden sm:block absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full bg-medexa-blue ring-4 ring-medexa-gray-50 z-10" />
            {insight.type === "protocol" ? (
              <Card className="p-4 rounded-2xl border-l-4 border-l-medexa-green border border-medexa-gray-100 shadow-[0_8px_24px_rgba(16,185,129,0.08)] bg-white">
                <Badge className="bg-medexa-blue hover:bg-medexa-blue text-white rounded-full px-3 mb-2 font-semibold tracking-wide">
                  {insight.label || "Protocol Ask"}
                </Badge>
                <p className="font-medium text-medexa-gray-900 break-words">
                  &ldquo;{insight.question}&rdquo;
                </p>
              </Card>
            ) : (
              <Card className="p-4 rounded-2xl border border-medexa-gray-100 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-2 gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 font-semibold text-medexa-gray-500 border-medexa-gray-200 capitalize text-xs"
                  >
                    {insight.type === "billing" ? "Billing" : insight.label || "Detected"}
                  </Badge>
                  {insight.status === "pending" && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-medexa-gray-400 flex items-center gap-1 hover:text-red-500 transition-colors shrink-0"
                      onClick={() =>
                        api.ignoreInsight(sessionId, insight.id).then(() => onChanged())
                      }
                    >
                      <X className="h-3 w-3" /> Ignore
                    </button>
                  )}
                </div>
                <p className="font-semibold text-medexa-gray-900 text-sm break-words">
                  {formatDetectedLine(insight)}
                </p>
                {insight.description && insight.type === "detected" && (
                  <p className="text-xs text-medexa-gray-500 mt-1 break-words">
                    {insight.description}
                  </p>
                )}
                {insight.status === "pending" && (
                  <SwipeToApprove
                    onApprove={() =>
                      api.approveInsight(sessionId, insight.id || "").then(() => onChanged())
                    }
                  />
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

        {assistantSuggestions
          .filter((s) => s.status === "active")
          .map((item) => (
            <div key={item.id} className="relative">
              <span className="hidden sm:block absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full bg-medexa-green ring-4 ring-medexa-gray-50 z-10" />
              <Card className="p-4 rounded-2xl border-l-4 border-l-medexa-blue border border-medexa-gray-100 bg-gradient-to-br from-white to-medexa-blue-light/30 shadow-sm">
                <Badge className="bg-medexa-green hover:bg-medexa-green text-white rounded-full px-3 mb-2 font-semibold tracking-wide">
                  Path B · {item.kind.replace(/_/g, " ")}
                </Badge>
                <p className="font-semibold text-medexa-gray-900 text-sm">{item.title}</p>
                <p className="text-sm text-medexa-gray-700 mt-1 break-words">{item.body}</p>
                <p className="text-[10px] text-medexa-gray-400 mt-2">{item.disclaimer}</p>
              </Card>
            </div>
          ))}

        {insights.length === 0 && assistantSuggestions.length === 0 && (
          <div className="text-sm text-medexa-gray-400 pl-1 sm:pl-2">
            Send a transcript chunk below — Path A insights will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
