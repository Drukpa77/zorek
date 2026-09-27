"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { type SpecimenMode, specimenModeNames } from "@/lib/home-content";

const SpecimenCanvas = dynamic(
  () => import("@/components/home/specimen-canvas").then((mod) => mod.SpecimenCanvas),
  { ssr: false },
);

type Readout = { key: string; mode: string; plate: string; note: string };

const INITIAL: Readout = { key: "fragment", mode: "Fragment", plate: "01", note: "State / unresolved" };

// Reads the plate under the viewport centre. Full-width plates declare
// data-sculpt="none" and cover the panel, so the last readout is kept.
function readCentre(previous: Readout): Readout {
  const mid = window.innerHeight / 2;
  let target: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>("[data-sculpt]").forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.top <= mid && rect.bottom >= mid) target = element;
  });
  if (!target) return previous;
  const element = target as HTMLElement;
  const mode = element.dataset.sculpt as SpecimenMode | "none" | undefined;
  if (!mode) return previous;
  if (mode === "none") {
    return previous.key === "none" ? previous : { ...previous, key: "none" };
  }
  const next = {
    key: mode,
    mode: specimenModeNames[mode] ?? mode,
    plate: element.dataset.plate ?? "—",
    note: element.dataset.note ?? "",
  };
  return next.key === previous.key && next.plate === previous.plate && next.note === previous.note ? previous : next;
}

function canRenderSculpture() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = Boolean(connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g");
  const lowEnd = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency < 4;
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(max-width: 899px)").matches &&
    !slow &&
    !lowEnd
  );
}

export function SpecimenFrame() {
  const [readout, setReadout] = useState(INITIAL);
  const [sculpture, setSculpture] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setReadout((previous) => readCentre(previous)));
    };
    // Interactive plates (e.g. What we build) change data-sculpt without scrolling.
    const mutations = new MutationObserver(update);
    mutations.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-sculpt", "data-plate", "data-note"],
    });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    const start = () => {
      if (canRenderSculpture()) setSculpture(true);
    };
    const idle = window.requestIdleCallback?.(start, { timeout: 1200 });
    const timer = idle === undefined ? window.setTimeout(start, 300) : 0;
    const wide = window.matchMedia("(max-width: 899px)");
    const onWide = () => start();
    wide.addEventListener("change", onWide);
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
      wide.removeEventListener("change", onWide);
      cancelAnimationFrame(frame);
      mutations.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <aside className="specimen-panel" aria-hidden="true">
      {sculpture ? <SpecimenCanvas mode={readout.key} /> : null}
      <div className="specimen-meta absolute inset-[84px_24px_24px] text-label">
        <span className="absolute top-0 left-0 size-[14px] border-t border-l border-ink" />
        <span className="absolute top-0 right-0 size-[14px] border-t border-r border-ink" />
        <span className="absolute bottom-0 left-0 size-[14px] border-b border-l border-ink" />
        <span className="absolute right-0 bottom-0 size-[14px] border-r border-b border-ink" />
        <span className="type-mono absolute top-0 left-6">
          Specimen / <span className="text-ink">{readout.mode}</span>
        </span>
        <span className="type-mono absolute top-0 right-6">
          Plate / <span>{readout.plate}</span>
        </span>
        <span className="type-mono absolute bottom-0 left-6">{readout.note}</span>
        <span className="type-mono absolute right-6 bottom-0 text-acc">● Realtime</span>
        <span className="absolute top-1/2 left-1/2 h-px w-[9px] -translate-x-1/2 bg-[rgba(17,17,16,0.4)]" />
        <span className="absolute top-1/2 left-1/2 h-[9px] w-px -translate-y-1/2 bg-[rgba(17,17,16,0.4)]" />
      </div>
    </aside>
  );
}
