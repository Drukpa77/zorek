"use client";

import { useRef } from "react";

const ROLES = ["ENGINEER", "DESIGNER", "DEVELOPER", "QUALITY", "STRATEGY"] as const;

export function FounderPortrait() {
  const frameRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  // Writes CSS variables directly: pointer tracking should not re-render React.
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame || event.pointerType !== "mouse") return;
    const rect = frame.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    frame.style.setProperty("--fx", `${(x * 100).toFixed(1)}%`);
    frame.style.setProperty("--fy", `${(y * 100).toFixed(1)}%`);
    if (wordRef.current) wordRef.current.textContent = ROLES[Math.min(ROLES.length - 1, Math.floor(x * ROLES.length))];
  };

  return (
    <div ref={frameRef} className="founder-portrait" data-cursor="EXPLORE" onPointerMove={onPointerMove}>
      <span className="type-mono absolute inset-0 flex items-center justify-center text-on-dark-muted">
        Founder portrait
      </span>
      <span aria-hidden="true" className="founder-line-x" />
      <span aria-hidden="true" className="founder-line-y" />
      <span ref={wordRef} aria-hidden="true" className="founder-word">
        {ROLES[0]}
      </span>
    </div>
  );
}
