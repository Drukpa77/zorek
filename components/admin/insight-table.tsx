"use client";

import type { Status } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInsight, duplicateInsight, setInsightPublished, toggleInsightFeatured, trashInsight } from "@/app/admin/insights/actions";
import { ConfirmDialog, Toast, useToast } from "@/components/admin/ui";
import { statusColors } from "@/lib/content-status";

export type InsightRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags: string;
  status: Status;
  statusLabel: string;
  featured: boolean;
  published: string;
  updated: string;
  thumb: string | null;
};

const FILTERS: { key: "ALL" | Status; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Draft" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "ARCHIVED", label: "Archived" },
];

export function InsightTable({ rows, canPublish }: { rows: InsightRow[]; canPublish: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [query, setQuery] = useState("");
  const [trashing, setTrashing] = useState<InsightRow | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast, notify } = useToast();

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => (filter === "ALL" || r.status === filter) && (!q || `${r.title} ${r.category} ${r.tags}`.toLowerCase().includes(q)));

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) notify(result.error ?? "That didn't work. Try again.");
      else {
        notify(success);
        router.refresh();
      }
    });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow mb-2">Content · Journal</p>
          <h1 className="admin-h1 text-[clamp(28px,3vw,38px)]">Insights</h1>
        </div>
        <form action={createInsight}>
          <button type="submit" className="admin-btn-primary">
            + New article
          </button>
        </form>
      </div>

      <div className="mb-3 flex flex-wrap justify-between gap-2.5">
        <div role="group" aria-label="Filter by status" className="admin-segments">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="admin-segment">
              {f.label} <span className="font-mono text-[10px] text-label">{f.key === "ALL" ? rows.length : rows.filter((r) => r.status === f.key).length}</span>
            </button>
          ))}
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…" aria-label="Filter articles" className="admin-field w-[min(260px,100%)]" />
      </div>

      <div className="overflow-x-auto border border-a-border bg-a-panel">
        <table className="admin-table min-w-[960px]">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Tags</th>
              <th scope="col">Status</th>
              <th scope="col">Featured</th>
              <th scope="col">Published</th>
              <th scope="col">Updated</th>
              <th scope="col" className="text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="max-w-[360px]">
                  <Link href={`/admin/insights/${row.id}`} className="flex items-center gap-3 font-medium hover:text-acc">
                    <span className="admin-row-thumb" aria-hidden="true">
                      {row.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.thumb} alt="" className="size-full object-cover" />
                      ) : null}
                    </span>
                    <span className="line-clamp-2">{row.title}</span>
                  </Link>
                </td>
                <td className="text-label">{row.category}</td>
                <td className="max-w-[180px] truncate text-label">{row.tags}</td>
                <td>
                  <span className="admin-status" style={{ background: statusColors[row.status].bg, color: statusColors[row.status].fg }}>
                    {row.statusLabel}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="admin-star"
                    aria-pressed={row.featured}
                    aria-label={`Featured: ${row.title}`}
                    disabled={!canPublish || pending}
                    onClick={() => run(() => toggleInsightFeatured(row.id), row.featured ? "No longer featured" : "Featured")}
                  >
                    {row.featured ? "★" : "☆"}
                  </button>
                </td>
                <td className="font-mono text-[11px] text-label">{row.published}</td>
                <td className="font-mono text-[11px] text-label">{row.updated}</td>
                <td className="text-right whitespace-nowrap">
                  <Link href={`/admin/insights/${row.id}`} className="admin-row-action">
                    Edit
                  </Link>
                  <a href={`/api/admin/preview?path=/insights/${row.slug}`} target="_blank" rel="noopener" className="admin-row-action">
                    Preview ↗<span className="sr-only"> {row.title} (opens in a new tab)</span>
                  </a>
                  <button type="button" className="admin-row-action" disabled={pending} onClick={() => run(() => duplicateInsight(row.id), "Duplicated as a draft")}>
                    Duplicate
                  </button>
                  {canPublish ? (
                    <>
                      <button
                        type="button"
                        className="admin-row-action"
                        disabled={pending}
                        onClick={() => {
                          const live = row.status === "PUBLISHED" || row.status === "SCHEDULED";
                          run(() => setInsightPublished(row.id, !live), live ? "Unpublished" : "Published");
                        }}
                      >
                        {row.status === "PUBLISHED" || row.status === "SCHEDULED" ? "Unpublish" : "Publish"}
                      </button>
                      <button type="button" className="admin-row-action text-[var(--destructive)]" onClick={() => setTrashing(row)}>
                        Trash
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="m-0 p-10 text-center text-label">{rows.length === 0 ? "No articles yet. Write the first one." : "Nothing matches this filter."}</p>
        ) : null}
      </div>
      <p className="mt-2.5 font-mono text-[10px] tracking-[0.06em] text-label">NEWEST EDITS FIRST · TRASHED ITEMS ARE KEPT 30 DAYS</p>

      {trashing ? (
        <ConfirmDialog
          title="Move to trash?"
          body={`“${trashing.title}” will be removed from the site and this list. It's kept for 30 days in case you need it back.`}
          cta="Move to trash"
          onCancel={() => setTrashing(null)}
          onConfirm={async () => {
            const result = await trashInsight(trashing.id);
            setTrashing(null);
            if (!result.ok) return notify(result.error);
            notify("Moved to trash");
            router.refresh();
          }}
        />
      ) : null}
      <Toast message={toast} />
    </>
  );
}
