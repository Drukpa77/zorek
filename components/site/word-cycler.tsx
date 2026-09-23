"use client";

import { useEffect, useRef } from "react";

const LINES = ["Design.", "Engineer.", "Evolve.", "Design."] as const;

export function WordCycler() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let index = 0;
    let resetTimer = 0;
    const interval = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      index += 1;
      track.style.transition = "transform 1s cubic-bezier(.77,0,.18,1)";
      track.style.transform = `translateY(${-index * 25}%)`;
      if (index === 3) {
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          if (!trackRef.current) return;
          trackRef.current.style.transition = "none";
          trackRef.current.style.transform = "translateY(0)";
          index = 0;
        }, 1050);
      }
    }, 2200);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div className="word-cycle" aria-hidden="true">
      <div ref={trackRef} className="word-cycle-track">
        {LINES.map((line, index) => (
          <span
            key={`${line}-${index}`}
            className={index === 3 ? "word-cycle-line word-cycle-clone" : "word-cycle-line"}
            style={line === "Evolve." ? { color: "var(--acc)" } : undefined}
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
