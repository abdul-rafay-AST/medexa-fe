"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiSuggestion } from "@/lib/api";

interface SuggestionsPanelProps {
  suggestions: ApiSuggestion[];
  showLiveHighlight: boolean;
  onApply: (id: string) => Promise<void>;
}

export function SuggestionsPanel({
  suggestions,
  showLiveHighlight,
  onApply,
}: SuggestionsPanelProps) {
  const applied = suggestions.filter((s) => s.applied);
  const pending = suggestions.filter((s) => !s.applied);
  const live = showLiveHighlight ? pending[0] : null;
  const queue = showLiveHighlight ? pending.slice(1) : pending;

  return (
    <Card className="p-4 md:p-6 rounded-3xl bg-white shadow-sm border-medexa-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-medexa-gray-900">Suggestions</h2>
        <span className="h-6 w-6 rounded-full bg-medexa-blue text-white text-xs flex items-center justify-center font-bold">
          {suggestions.length}
        </span>
      </div>
      <div className="flex flex-col gap-4 max-h-[55vh] lg:max-h-[65vh] overflow-y-auto pr-1">
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
          <div className="text-sm text-medexa-gray-400">
            No billing suggestions yet. Path A will propose CPT timers from transcript.
          </div>
        )}
      </div>
    </Card>
  );
}
