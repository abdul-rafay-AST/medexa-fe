"use client";

import { Check, Activity, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiAssistantSuggestion, ApiSuggestion, ApiExtractedEntity } from "@/lib/api";

interface SuggestionsPanelProps {
  suggestions: ApiSuggestion[];
  assistantSuggestions: ApiAssistantSuggestion[];
  entities: ApiExtractedEntity[];
  showLiveHighlight: boolean;
  onApply: (id: string) => Promise<void>;
}

export function SuggestionsPanel({
  suggestions,
  assistantSuggestions,
  entities,
  showLiveHighlight,
  onApply,
}: SuggestionsPanelProps) {
  const applied = suggestions.filter((s) => s.applied);
  const pending = suggestions.filter((s) => !s.applied);
  const live = showLiveHighlight ? pending[0] : null;
  const queue = showLiveHighlight ? pending.slice(1) : pending;
  const pathBActive = assistantSuggestions.filter((s) => s.status === "active");

  return (
    <Card className="p-4 md:p-6 rounded-3xl bg-white shadow-sm border-medexa-gray-100 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="font-semibold text-medexa-gray-900">Suggestions & Entities</h2>
      </div>

      <Tabs defaultValue="billing" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full grid grid-cols-3 bg-medexa-gray-50 p-1 rounded-full mb-4 shrink-0">
          <TabsTrigger value="billing" className="rounded-full text-[10px] md:text-xs font-semibold px-1">
            Billing ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="clinical" className="rounded-full text-[10px] md:text-xs font-semibold px-1">
            Clinical ({pathBActive.length})
          </TabsTrigger>
          <TabsTrigger value="entities" className="rounded-full text-[10px] md:text-xs font-semibold px-1">
            Entities ({entities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="flex-1 overflow-y-auto pr-2 scrollbar-thin outline-none mt-0">
          <div className="flex flex-col gap-4">
            {live && (
              <Card className="p-4 rounded-2xl bg-white border border-medexa-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-medexa-gray-500 mb-2">Current Live CPT</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-medexa-green animate-pulse shrink-0" />
                  <Badge className="bg-medexa-gray-900 text-white rounded-full px-3 py-0.5 text-xs font-bold hover:bg-medexa-gray-900 max-w-full truncate">
                    {live.title}
                  </Badge>
                </div>
                <p className="text-sm text-medexa-gray-900 font-medium break-words">{live.text}</p>
                <div className="flex justify-end border-t border-medexa-gray-100 pt-2 mt-3">
                  <Button
                    variant="ghost"
                    className="text-medexa-blue font-bold tracking-wide flex items-center gap-2 h-8 px-2 hover:bg-transparent text-sm"
                    onClick={() => onApply(live.id)}
                  >
                    <Check className="h-4 w-4" /> Apply
                  </Button>
                </div>
              </Card>
            )}

            {applied.map((suggestion) => (
              <Card
                key={suggestion.id}
                className="p-4 rounded-2xl bg-white border border-medexa-gray-200 shadow-sm"
              >
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

            {queue.map((suggestion) => {
              const isModifier = /modifier|ncci|bundle/i.test(suggestion.title + suggestion.text);
              return (
                <Card
                  key={suggestion.id}
                  className="p-4 rounded-2xl bg-white border border-medexa-gray-200 shadow-sm"
                >
                  <Badge
                    className={`rounded-full px-3 py-0.5 text-xs font-bold mb-2 max-w-full truncate ${
                      isModifier
                        ? "bg-medexa-gray-900 text-white hover:bg-medexa-gray-900"
                        : "bg-medexa-blue/10 text-medexa-blue hover:bg-medexa-blue/10"
                    }`}
                  >
                    {suggestion.title}
                  </Badge>
                  <p className="text-sm text-medexa-gray-900 mb-3 font-medium break-words">
                    {suggestion.text}
                  </p>
                  <div className="flex justify-end border-t border-medexa-gray-100 pt-2">
                    <Button
                      variant="ghost"
                      className="text-medexa-blue font-bold tracking-wide flex items-center gap-2 h-8 px-2 hover:bg-transparent text-sm"
                      onClick={() => onApply(suggestion.id)}
                    >
                      <Check className="h-4 w-4" /> Apply
                    </Button>
                  </div>
                </Card>
              );
            })}

            {suggestions.length === 0 && (
              <div className="text-sm text-medexa-gray-400 p-2">
                No billing suggestions yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="flex-1 overflow-y-auto pr-2 scrollbar-thin outline-none mt-0">
          <div className="flex flex-col gap-4">
            {pathBActive.map((item) => (
              <Card key={item.id} className="p-4 rounded-2xl border-l-4 border-l-medexa-blue border border-medexa-gray-100 bg-gradient-to-br from-white to-medexa-blue-light/10 shadow-sm">
                <Badge className="bg-medexa-green hover:bg-medexa-green text-white rounded-full px-3 mb-2 font-semibold tracking-wide">
                  {item.kind.replace(/_/g, " ")}
                </Badge>
                <p className="font-semibold text-medexa-gray-900 text-sm">{item.title}</p>
                <p className="text-sm text-medexa-gray-700 mt-1 break-words">{item.body}</p>
                <p className="text-[10px] text-medexa-gray-400 mt-2 leading-tight">{item.disclaimer}</p>
              </Card>
            ))}

            {pathBActive.length === 0 && (
              <div className="text-sm text-medexa-gray-400 p-2">
                Clinical suggestions from Path B will appear here.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="entities" className="flex-1 overflow-y-auto pr-2 scrollbar-thin outline-none mt-0">
          <div className="flex flex-col gap-3">
            {entities.length === 0 ? (
              <div className="text-sm text-medexa-gray-400 p-2 flex flex-col items-center justify-center h-full text-center gap-2 mt-8">
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
        </TabsContent>
      </Tabs>
    </Card>
  );
}
