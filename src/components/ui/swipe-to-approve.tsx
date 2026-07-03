"use client";

import React, { useState, useRef } from "react";
import { ChevronRight, Check } from "lucide-react";

interface SwipeToApproveProps {
  onApprove: () => void;
}

export function SwipeToApprove({ onApprove }: SwipeToApproveProps) {
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeWidth, setSwipeWidth] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isApproved) return;
    setIsSwiping(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || !containerRef.current || isApproved) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const handleWidth = 40; // width of the thumb
    const maxSwipeWidth = containerRect.width - handleWidth;

    let newWidth = e.clientX - containerRect.left;
    newWidth = Math.max(0, Math.min(newWidth, maxSwipeWidth));
    
    setSwipeWidth(newWidth);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || !containerRef.current || isApproved) return;
    setIsSwiping(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const containerRect = containerRef.current.getBoundingClientRect();
    const maxSwipeWidth = containerRect.width - 40;

    if (swipeWidth > maxSwipeWidth * 0.8) {
      // Trigger approval if swiped more than 80%
      setSwipeWidth(maxSwipeWidth);
      setIsApproved(true);
      setTimeout(() => {
        onApprove();
      }, 300);
    } else {
      // Snap back
      setSwipeWidth(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center h-12 w-full md:w-64 bg-white border border-medexa-gray-200 rounded-full overflow-hidden select-none touch-none mt-1"
    >
      {/* Background fill */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-blue-50 transition-none"
        style={{ width: `${swipeWidth + 40}px` }}
      />

      {/* Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-semibold text-medexa-blue pl-4">
          {isApproved ? "Approved" : "Slide to Approve"}
        </span>
      </div>

      {/* Handle */}
      <div
        className={`absolute left-1 top-1 bottom-1 w-10 flex items-center justify-center rounded-full bg-medexa-gray-50 shadow-sm cursor-grab active:cursor-grabbing transition-transform ${isSwiping ? "" : "duration-200"}`}
        style={{ transform: `translateX(${swipeWidth}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {isApproved ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-medexa-blue" />
        )}
      </div>
    </div>
  );
}
