"use client";

import { useEffect, useRef, useState } from "react";
import { Picture } from "@/components/work/picture";
import type { MediaView } from "@/lib/media";

export function BeforeAfter({ before, after, beforeLabel, afterLabel }: { before: MediaView; after: MediaView; beforeLabel: string; afterLabel: string }) {
  const [value, setValue] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromPointer = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setValue(Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))));
  };

  useEffect(() => {
    const move = (e: PointerEvent) => dragging.current && fromPointer(e.clientX);
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div
      ref={frame}
      className="before-after"
      data-cursor="DRAG"
      onPointerDown={(e) => {
        dragging.current = true;
        fromPointer(e.clientX);
      }}
    >
      <Picture media={after} sizes="100vw" className="before-after-layer" imgClassName="size-full object-cover" alt={`${afterLabel}: ${after.alt}`} />
      <div className="before-after-layer" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
        <Picture media={before} sizes="100vw" className="block size-full" imgClassName="size-full object-cover" alt={`${beforeLabel}: ${before.alt}`} />
      </div>
      <span className="before-after-tag left-[3%]">{beforeLabel}</span>
      <span className="before-after-tag right-[3%]">{afterLabel}</span>
      <div className="before-after-handle" style={{ left: `${value}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Before and after comparison"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value}% ${beforeLabel.toLowerCase()}`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 20 : 5;
            const next =
              e.key === "ArrowLeft" || e.key === "ArrowDown"
                ? value - step
                : e.key === "ArrowRight" || e.key === "ArrowUp"
                  ? value + step
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 100
                      : null;
            if (next === null) return;
            e.preventDefault();
            setValue(Math.min(100, Math.max(0, next)));
          }}
        >
          <span aria-hidden="true">↔</span>
        </button>
      </div>
    </div>
  );
}

export function VideoBlock({ src, poster, autoplay, label }: { src: string; poster?: string; autoplay: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [allowAutoplay, setAllowAutoplay] = useState(false);

  useEffect(() => {
    setAllowAutoplay(autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [autoplay]);

  useEffect(() => {
    if (allowAutoplay) void ref.current?.play().catch(() => {});
  }, [allowAutoplay]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      controls
      playsInline
      muted={autoplay}
      loop={autoplay}
      preload="metadata"
      aria-label={label}
      className="w-full"
    />
  );
}
