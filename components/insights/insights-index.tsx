"use client";

import Link from "next/link";
import { useState } from "react";
import { Picture } from "@/components/work/picture";
import type { MediaView } from "@/lib/media-view";

export type InsightItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  date: string | null;
  minutes: number;
  featured: boolean;
  image: MediaView | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function InsightsIndex({ items, categories }: { items: InsightItem[]; categories: string[] }) {
  const [filter, setFilter] = useState("All");
  // The lead essay is the newest featured article (or simply the newest).
  const lead = items.find((i) => i.featured) ?? items[0] ?? null;
  const showLead = Boolean(lead && (filter === "All" || lead.category === filter));
  const rows = items.filter((i) => (filter === "All" || i.category === filter) && !(showLead && i === lead));

  return (
    <>
      <div role="group" aria-label="Filter by category" className="work-filters">
        {["All", ...categories].map((c) => (
          <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)} className="type-mono">
            {c}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {rows.length + (showLead ? 1 : 0)} articles shown
      </p>

      {showLead && lead ? (
        <section className="py-[4vh] pb-[10vh]" aria-label="Lead essay">
          <Link href={`/insights/${lead.slug}`} data-cursor="READ" className="insight-lead">
            <span className="insight-lead-media">
              {lead.image ? (
                <Picture media={lead.image} sizes="(min-width: 900px) 50vw, 100vw" imgClassName="size-full object-cover" alt="" />
              ) : (
                <span className="type-mono">Lead essay</span>
              )}
            </span>
            <span className="flex flex-col gap-[18px]">
              <span className="type-mono text-acc">
                Lead essay{lead.category ? ` · ${lead.category}` : ""}
                {lead.date ? ` · ${lead.date}` : ""}
              </span>
              <span className="insight-lead-title">{lead.title}</span>
              {lead.excerpt ? <span className="max-w-[480px] text-[18px] leading-[1.5] text-muted">{lead.excerpt}</span> : null}
              <span className="type-mono">Read essay · {lead.minutes} min ↗</span>
            </span>
          </Link>
        </section>
      ) : null}

      {rows.length === 0 && !showLead ? (
        <p className="py-[10vh] text-[18px] text-muted">No {filter} articles are published yet.</p>
      ) : rows.length ? (
        <ul className="m-0 mt-[2vh] list-none border-t border-ink p-0" aria-label="Articles">
          {rows.map((item) => (
            <li key={item.slug}>
              <Link href={`/insights/${item.slug}`} data-cursor="READ" className="insight-row">
                <span className="font-mono text-[11px] text-faint">{pad(items.indexOf(item) + 1)}</span>
                <span className="insight-row-title">{item.title}</span>
                <span className="text-[15px] leading-[1.5] text-muted">{item.excerpt}</span>
                <span className="type-mono text-right text-label">
                  {item.category}
                  {item.date ? <span className="block">{item.date}</span> : null}
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
