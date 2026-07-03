"use client";

import React, { useState, useRef } from "react";
import { ChevronRight, Check } from "lucide-react";

interface SwipeToApproveProps {
  onApprove: () => void;
}

export function SwipeToApprove({ onApprove }: SwipeToApproveProps) {
  const [swipeWidth, setSwipeWidth] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeWidthRef = useRef(0);
  const THUMB = 40;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isApproved) return;
    setIsSwiping(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || !containerRef.current || isApproved) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxSwipe = rect.width - THUMB;
    const next = Math.max(0, Math.min(e.clientX - rect.left, maxSwipe));
    swipeWidthRef.current = next;
    setSwipeWidth(next);
  };

  const finishSwipe = () => {
    if (!containerRef.current || isApproved) return;
    setIsSwiping(false);
    const maxSwipe = containerRef.current.getBoundingClientRect().width - THUMB;
    const current = swipeWidthRef.current;

    if (current > maxSwipe * 0.75) {
      swipeWidthRef.current = maxSwipe;
      setSwipeWidth(maxSwipe);
      setIsApproved(true);
      setTimeout(() => onApprove(), 200);
    } else {
      swipeWidthRef.current = 0;
      setSwipeWidth(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center h-12 w-full bg-white border border-medexa-gray-200 rounded-full overflow-hidden select-none touch-none mt-1"
      style={{ touchAction: "none" }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 bg-medexa-blue-light transition-none"
        style={{ width: `${swipeWidth + THUMB}px` }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <span className="text-sm font-semibold text-medexa-blue">
          {isApproved ? "Approved" : "Slide to Approve"}
        </span>
      </div>
      <div
        className={`absolute left-1 top-1 bottom-1 w-10 flex items-center justify-center rounded-full bg-white shadow-md border border-medexa-gray-100 z-10 ${isSwiping ? "" : "transition-transform duration-200"}`}
        style={{ transform: `translateX(${swipeWidth}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSwipe}
        onPointerCancel={finishSwipe}
      >
        {isApproved ? (
          <Check className="h-4 w-4 text-medexa-green" />
        ) : (
          <ChevronRight className="h-4 w-4 text-medexa-blue" />
        )}
      </div>
    </div>
  );
}
