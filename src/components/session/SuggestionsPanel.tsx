"use client";

import { Activity, Check, MapPin, Search } from "lucide-react";
import { AiInfoIcon } from "@/components/ui/ai-info-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiAssistantSuggestion, ApiExtractedEntity, ApiSuggestion } from "@/lib/api";
import { displayBodyRegion, groupEntitiesByRegion } from "@/lib/bodyRegions";

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
  const entityGroups = groupEntitiesByRegion(entities);

  return (
    <Card className="p-4 md:p-6 rounded-3xl bg-white shadow-sm border-medexa-gray-100 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="font-semibold text-medexa-gray-900 flex items-center gap-2">
          Live Assistant
          <AiInfoIcon />
        </h2>
      </div>

      <Tabs defaultValue="billing" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="w-full grid grid-cols-3 bg-medexa-gray-50 p-1 rounded-full mb-3 shrink-0">
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

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent
            value="billing"
            className="h-full m-0 data-[state=inactive]:hidden"
          >
            <div className="h-full max-h-[min(52vh,520px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-medexa-gray-200">
              <div className="flex flex-col gap-4 pb-2">
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
                  <div className="text-sm text-medexa-gray-400 p-2">No billing suggestions yet.</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="clinical"
            className="h-full m-0 data-[state=inactive]:hidden"
          >
            <div className="h-full max-h-[min(52vh,520px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-medexa-gray-200">
              <div className="flex flex-col gap-4 pb-2">
                {pathBActive.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 rounded-2xl border-l-4 border-l-medexa-blue border border-medexa-gray-100 bg-gradient-to-br from-white to-medexa-blue-light/10 shadow-sm"
                  >
                    <Badge className="bg-medexa-green hover:bg-medexa-green text-white rounded-full px-3 mb-2 font-semibold tracking-wide">
                      {item.kind.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex items-start gap-2">
                      <p className="font-semibold text-medexa-gray-900 text-sm flex-1">{item.title}</p>
                      <AiInfoIcon message={item.disclaimer || undefined} />
                    </div>
                    <p className="text-sm text-medexa-gray-700 mt-1 break-words">{item.body}</p>
                  </Card>
                ))}

                {pathBActive.length === 0 && (
                  <div className="text-sm text-medexa-gray-400 p-2">
                    Clinical suggestions from Path B will appear here.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="entities"
            className="h-full m-0 data-[state=inactive]:hidden"
          >
            <div className="h-full max-h-[min(52vh,520px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-medexa-gray-200">
              <div className="flex items-center gap-2 mb-3 text-medexa-gray-600">
                <Activity className="h-4 w-4 text-medexa-blue" />
                <span className="text-xs font-semibold">Path A extracted entities</span>
              </div>
              <div className="flex flex-col gap-3 pb-2">
                {entities.length === 0 ? (
                  <div className="text-sm text-medexa-gray-400 p-2 flex flex-col items-center justify-center text-center gap-2 py-8">
                    <Search className="h-8 w-8 text-medexa-gray-200" />
                    <p>No clinical entities detected yet.</p>
                  </div>
                ) : (
                  entityGroups.map((group) => (
                    <div key={group.regionKey} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-1">
                        <MapPin className="h-3.5 w-3.5 text-medexa-blue" />
                        <p className="text-xs font-bold uppercase tracking-wide text-medexa-gray-600">
                          {group.label}
                        </p>
                      </div>
                      {group.items.map((entity) => (
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
                              &ldquo;{entity.phrase}&rdquo;
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
                                <MapPin className="h-3 w-3 text-medexa-gray-400" />{" "}
                                {entity.displayRegion || displayBodyRegion(entity.region)}
                              </Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}
