"use client";

import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiExtractedEntity } from "@/lib/api";

interface EntitiesSidebarProps {
  entities: ApiExtractedEntity[];
}

export function EntitiesSidebar({ entities }: EntitiesSidebarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="p-4 md:p-6 rounded-3xl bg-white shadow-sm border-medexa-gray-100 flex flex-col min-h-0 flex-1">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="font-semibold text-medexa-gray-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-medexa-blue" /> Clinical Entities
        </h2>
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-medexa-gray-100 text-medexa-gray-500 text-xs flex items-center justify-center font-bold">
            {entities.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-medexa-gray-500"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse entities" : "Expand entities"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-medexa-gray-200">
          {entities.length === 0 ? (
            <div className="text-sm text-medexa-gray-400 p-2 flex flex-col items-center justify-center h-full text-center gap-2">
              <Search className="h-8 w-8 text-medexa-gray-200" />
              <p>No clinical entities detected yet.</p>
              <p className="text-xs">Symptoms, body regions, and procedures will appear here.</p>
            </div>
          ) : (
            entities.map((entity) => (
              <Card
                key={entity.id}
                className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                  entity.isBillable
                    ? "bg-medexa-blue/5 border-medexa-blue/20"
                    : "bg-medexa-gray-50 border-medexa-gray-200/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-medexa-gray-900 text-sm leading-tight break-words">
                    "{entity.phrase}"
                  </p>
                  {entity.isBillable && (
                    <Badge className="bg-medexa-blue text-white rounded-full text-[10px] font-bold px-2 py-0 hover:bg-medexa-blue shrink-0">
                      Billable
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {entity.cpt && (
                    <Badge variant="outline" className="text-[10px] font-semibold border-medexa-gray-200 bg-white text-medexa-gray-600 rounded-md">
                      CPT: {entity.cpt}
                    </Badge>
                  )}
                  {entity.icd10 && (
                    <Badge variant="outline" className="text-[10px] font-semibold border-medexa-gray-200 bg-white text-medexa-gray-600 rounded-md">
                      ICD-10: {entity.icd10}
                    </Badge>
                  )}
                  {entity.region && (
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-white text-medexa-gray-600 border border-medexa-gray-200 rounded-md flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-medexa-gray-400" /> {entity.region}
                    </Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
