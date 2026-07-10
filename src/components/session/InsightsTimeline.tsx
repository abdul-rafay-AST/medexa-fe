"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api, ApiInsight } from "@/lib/api";

interface InsightsTimelineProps {
  sessionId: string;
  insights: ApiInsight[];
  onChanged: () => Promise<void>;
}

export function InsightsTimeline({
  sessionId,
  insights,
  onChanged,
}: InsightsTimelineProps) {
  const visible = insights.filter((i) => i.type !== "detected");

  const formatDetectedLine = (insight: ApiInsight) => {
    if (insight.type === "billing") return insight.question;
    return insight.question || insight.description;
  };

  return (
    <div className="relative mt-1 min-w-0">
      <div className="absolute left-[15px] top-3 bottom-0 border-l-2 border-dashed border-medexa-blue/25 hidden sm:block" />
      <p className="text-sm text-medexa-gray-500 mb-4 pl-1 sm:pl-2">
        Session insights — billing CPT actions use <strong>Apply</strong> in the assistant panel.
      </p>
      <div className="flex flex-col gap-5 relative pl-0 sm:pl-8">
        {visible.map((insight, idx) => (
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
              <Card
                className={`p-4 rounded-2xl border shadow-sm bg-white ${
                  insight.type === "billing"
                    ? "border-l-4 border-l-amber-500 border-amber-100"
                    : "border-medexa-gray-100"
                }`}
              >
                <div className="flex justify-between items-center mb-2 gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 font-semibold text-medexa-gray-500 border-medexa-gray-200 capitalize text-xs"
                  >
                    {insight.type === "billing" ? "NCCI Billing" : insight.label || "Alert"}
                  </Badge>
                  {insight.status === "pending" && insight.type !== "billing" && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-medexa-gray-400 hover:text-red-500 transition-colors shrink-0"
                      onClick={() =>
                        api.ignoreInsight(sessionId, insight.id).then(() => onChanged())
                      }
                    >
                      Dismiss
                    </button>
                  )}
                </div>
                <p className="font-semibold text-medexa-gray-900 text-sm break-words">
                  {formatDetectedLine(insight)}
                </p>
                {insight.description && (
                  <p className="text-xs text-medexa-gray-500 mt-1 break-words">
                    {insight.description}
                  </p>
                )}
                {insight.status === "approved" && insight.type === "billing" && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-800">
                    <Check className="h-3.5 w-3.5" /> Logged — resolve at claim review if Modifier 59 applies
                  </div>
                )}
              </Card>
            )}
          </div>
        ))}

        {visible.length === 0 && (
          <div className="text-sm text-medexa-gray-400 pl-1 sm:pl-2">
            Protocol and NCCI alerts appear here. CPT billing starts when you click Apply on a suggestion.
          </div>
        )}
      </div>
    </div>
  );
}
