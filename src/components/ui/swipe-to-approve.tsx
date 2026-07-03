"use client";

import React, { useState, useRef, useCallback } from "react";
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
  const isSwipingRef = useRef(false);
  const THUMB = 40;

  const maxSwipe = useCallback(() => {
    if (!containerRef.current) return 0;
    return Math.max(0, containerRef.current.getBoundingClientRect().width - THUMB);
  }, []);

  const setSwipe = (next: number) => {
    const clamped = Math.max(0, Math.min(next, maxSwipe()));
    swipeWidthRef.current = clamped;
    setSwipeWidth(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isApproved) return;
    isSwipingRef.current = true;
    setIsSwiping(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setSwipe(e.clientX - rect.left - THUMB / 2);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwipingRef.current || !containerRef.current || isApproved) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSwipe(e.clientX - rect.left - THUMB / 2);
  };

  const finishSwipe = () => {
    if (!containerRef.current || isApproved) return;
    isSwipingRef.current = false;
    setIsSwiping(false);
    const max = maxSwipe();
    const current = swipeWidthRef.current;

    if (current > max * 0.75) {
      swipeWidthRef.current = max;
      setSwipeWidth(max);
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
      className="relative flex items-center h-12 w-full bg-medexa-gray-50 border border-medexa-gray-200 rounded-full overflow-hidden select-none touch-none mt-3"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
    >
      <div
        className="absolute left-0 top-0 bottom-0 bg-medexa-blue/15 transition-none"
        style={{ width: `${swipeWidth + THUMB}px` }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <span className="text-sm font-semibold text-medexa-blue">
          {isApproved ? "Approved" : "Slide to Approve"}
        </span>
      </div>
      <div
        className={`absolute left-1 top-1 bottom-1 w-10 flex items-center justify-center rounded-full bg-medexa-blue text-white shadow-md z-10 cursor-grab active:cursor-grabbing ${isSwiping ? "" : "transition-transform duration-200"}`}
        style={{ transform: `translateX(${swipeWidth}px)` }}
      >
        {isApproved ? (
          <Check className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </div>
    </div>
  );
}
