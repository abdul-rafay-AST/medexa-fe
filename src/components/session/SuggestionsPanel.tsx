"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiAssistantSuggestion, ApiSuggestion } from "@/lib/api";

interface SuggestionsPanelProps {
  suggestions: ApiSuggestion[];
  assistantSuggestions: ApiAssistantSuggestion[];
  showLiveHighlight: boolean;
  onApply: (id: string) => Promise<void>;
}

export function SuggestionsPanel({
  suggestions,
  assistantSuggestions,
  showLiveHighlight,
  onApply,
}: SuggestionsPanelProps) {
  const applied = suggestions.filter((s) => s.applied);
  const pending = suggestions.filter((s) => !s.applied);
  const live = showLiveHighlight ? pending[0] : null;
  const queue = showLiveHighlight ? pending.slice(1) : pending;
  const pathBActive = assistantSuggestions.filter((s) => s.status === "active");

  return (
    <Card className="p-4 md:p-6 rounded-3xl bg-white shadow-sm border-medexa-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-medexa-gray-900">Suggestions</h2>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-medexa-gray-50 p-1 rounded-full mb-4">
          <TabsTrigger value="billing" className="rounded-full text-xs font-semibold">
            Billing ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="clinical" className="rounded-full text-xs font-semibold">
            Clinical ({pathBActive.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-0 outline-none">
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
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

        <TabsContent value="clinical" className="mt-0 outline-none">
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
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
      </Tabs>
    </Card>
  );
}
