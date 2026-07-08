"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApiLivePipelineSnapshot } from "@/lib/api";

function Pill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "gray";
}) {
  const tones = {
    blue: "bg-medexa-blue/10 text-medexa-blue border-medexa-blue/20",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gray: "bg-medexa-gray-50 text-medexa-gray-500 border-medexa-gray-200",
  };
  return (
    <div className={`flex-1 min-w-[96px] rounded-2xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}

export function PipelineStatusBar({ pipeline }: { pipeline: ApiLivePipelineSnapshot | null }) {
  if (!pipeline) return null;

  const pathBTone =
    pipeline.pathB.status === "completed" || pipeline.pathB.suggestionCount > 0
      ? "green"
      : pipeline.pathB.enabled
        ? "amber"
        : "gray";

  return (
    <Card className="p-3 rounded-2xl border-medexa-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-medexa-gray-500 uppercase tracking-wide">
          Live pipeline
        </p>
        <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
          {pipeline.billingRegion}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill
          label="Path A"
          value={`${pipeline.pathA.entityCount} entities · ${pipeline.pathA.units}u`}
          tone="blue"
        />
        <Pill
          label="Path B"
          value={
            pipeline.pathB.enabled
              ? `${pipeline.pathB.status} · ${pipeline.pathB.suggestionCount}`
              : "rules / off"
          }
          tone={pathBTone}
        />
        <Pill
          label="Path C"
          value={pipeline.pathC.status === "finalized" ? "done" : "await stop"}
          tone={pipeline.pathC.status === "finalized" ? "green" : "gray"}
        />
      </div>
    </Card>
  );
}
