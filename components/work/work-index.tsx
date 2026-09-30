"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Picture } from "@/components/work/picture";
import type { MediaView } from "@/lib/media";

export type WorkItem = {
  slug: string;
  name: string;
  client: string;
  description: string;
  year: number | null;
  type: string | null;
  services: string[];
  hero: MediaView | null;
};

const FILTERS = ["All", "Software", "Web", "Mobile"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export function WorkIndex({ items }: { items: WorkItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [view, setView] = useState<"index" | "plates">("index");
  const [hover, setHover] = useState<WorkItem | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [fine, setFine] = useState(false);

  useEffect(() => {
    setFine(window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Cursor-following preview: written straight to the DOM, no re-render per move.
  useEffect(() => {
    if (!fine) return;
    const move = (e: PointerEvent) => {
      if (preview.current) preview.current.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 120}px)`;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [fine]);

  const visible = items.filter((item) => filter === "All" || item.type === filter);
  const numberOf = (item: WorkItem) => pad(items.indexOf(item) + 1);

  return (
    <>
      <div className="work-controls">
        <div role="group" aria-label="Filter by type" className="work-filters">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="type-mono">
              {f}
            </button>
          ))}
        </div>
        <div role="group" aria-label="View" className="work-view">
          <button type="button" aria-pressed={view === "index"} onClick={() => setView("index")} className="type-mono">
            Index
          </button>
          <button type="button" aria-pressed={view === "plates"} onClick={() => setView("plates")} className="type-mono">
            Plates
          </button>
        </div>
      </div>

      <p className="sr-only" role="status">
        {visible.length} {visible.length === 1 ? "project" : "projects"} shown
      </p>

      {visible.length === 0 ? (
        <p className="py-[10vh] text-[18px] text-muted">No {filter.toLowerCase()} projects are published yet.</p>
      ) : view === "index" ? (
        <section className="work-list" aria-label="Projects" onPointerLeave={() => setHover(null)}>
          <div className="work-row work-row-head type-mono" aria-hidden="true">
            <span>No.</span>
            <span>Project</span>
            <span>Services</span>
            <span>Client</span>
            <span className="text-right">Year</span>
          </div>
          <ul className="m-0 list-none p-0">
            {visible.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/work/${item.slug}`}
                  data-cursor="VIEW"
                  className="work-row"
                  data-dim={hover && hover.slug !== item.slug ? "" : undefined}
                  onPointerEnter={() => setHover(item)}
                  onFocus={() => setHover(null)}
                >
                  <span className="font-mono text-[11px] text-acc">{numberOf(item)}</span>
                  <span className="work-row-title">{item.name}</span>
                  <span className="text-[14px] text-muted">{item.services.slice(0, 3).join(" · ")}</span>
                  <span className="text-[14px] text-muted">{item.client}</span>
                  <span className="text-right font-mono text-[11px]">{item.year ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>
          {fine ? (
            <div ref={preview} className="work-preview" aria-hidden="true" data-show={hover ? "" : undefined}>
              {hover?.hero ? (
                <Picture media={hover.hero} sizes="300px" imgClassName="size-full object-cover" alt="" />
              ) : (
                <span className="type-mono">{hover?.name}</span>
              )}
            </div>
          ) : null}
        </section>
      ) : (
        <ul className="work-plates" aria-label="Projects">
          {visible.map((item, i) => (
            <li key={item.slug} style={{ marginTop: i % 2 ? "8vh" : undefined }}>
              <Link href={`/work/${item.slug}`} data-cursor="VIEW" className="flex flex-col gap-3.5">
                <span className="work-plate-media">
                  {item.hero ? (
                    <Picture media={item.hero} sizes="(min-width: 900px) 50vw, 100vw" imgClassName="size-full object-cover" alt="" />
                  ) : (
                    <span className="type-mono">Project imagery</span>
                  )}
                </span>
                <span className="type-mono flex justify-between text-label">
                  <span>
                    <span className="text-acc">{numberOf(item)}</span>
                    {item.client ? ` · ${item.client}` : ""}
                  </span>
                  <span>{item.year ?? ""}</span>
                </span>
                <span className="text-[clamp(26px,2.4vw,38px)] leading-[1.05] font-semibold tracking-[-0.04em]">{item.name}</span>
                {item.description ? <span className="text-[15px] leading-[1.5] text-muted">{item.description}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
