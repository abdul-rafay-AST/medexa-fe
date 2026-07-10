"use client";

import { Info } from "lucide-react";

interface AiInfoIconProps {
  message?: string;
  className?: string;
}

const DEFAULT_MESSAGE =
  "This response is AI-generated for clinical decision support. Verify against your professional judgment and local protocols.";

export function AiInfoIcon({
  message = DEFAULT_MESSAGE,
  className = "",
}: AiInfoIconProps) {
  return (
    <span
      className={`relative inline-flex items-center group ${className}`}
      tabIndex={0}
      aria-label={message}
    >
      <Info className="h-3.5 w-3.5 text-medexa-gray-400 cursor-help shrink-0" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg bg-medexa-gray-900 text-white text-[10px] leading-snug p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 shadow-lg"
      >
        {message}
      </span>
    </span>
  );
}
