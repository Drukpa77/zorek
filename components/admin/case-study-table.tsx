"use client";

import type { Status } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createCaseStudy,
  duplicateCaseStudy,
  reorderCaseStudies,
  setPublished,
  toggleFeatured,
  trashCaseStudy,
} from "@/app/admin/case-studies/actions";
import { ConfirmDialog, Toast, useToast } from "@/components/admin/ui";
import { statusColors } from "@/lib/case-study-schema";

export type CaseStudyRow = {
  id: string;
  name: string;
  slug: string;
  client: string;
  industry: string;
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

export function CaseStudyTable({ rows: serverRows, canPublish }: { rows: CaseStudyRow[]; canPublish: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(serverRows);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [trashing, setTrashing] = useState<CaseStudyRow | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast, notify } = useToast();

  useEffect(() => setRows(serverRows), [serverRows]);

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) => (filter === "ALL" || r.status === filter) && (!q || `${r.name} ${r.client} ${r.industry}`.toLowerCase().includes(q)),
  );
  // Order only means something on the full, unfiltered list.
  const canReorder = canPublish && filter === "ALL" && !q;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) notify(result.error ?? "That didn't work. Try again.");
      else {
        notify(success);
        router.refresh();
      }
    });

  const commitOrder = (next: CaseStudyRow[]) => {
    setRows(next);
    run(() => reorderCaseStudies(next.map((r) => r.id)), "Order saved");
  };

  const move = (rowId: string, delta: number) => {
    const from = rows.findIndex((r) => r.id === rowId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commitOrder(next);
    requestAnimationFrame(() => document.getElementById(`move-${rowId}-${delta < 0 ? "up" : "down"}`)?.focus());
  };

  const dropOn = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const next = rows.filter((r) => r.id !== dragging);
    const index = next.findIndex((r) => r.id === targetId);
    const item = rows.find((r) => r.id === dragging);
    if (!item) return;
    next.splice(index, 0, item);
    setDragging(null);
    commitOrder(next);
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow mb-2">Content · Portfolio</p>
          <h1 className="admin-h1 text-[clamp(28px,3vw,38px)]">Case studies</h1>
        </div>
        <form action={createCaseStudy}>
          <button type="submit" className="admin-btn-primary">
            + New case study
          </button>
        </form>
      </div>

      <div className="mb-3 flex flex-wrap justify-between gap-2.5">
        <div role="group" aria-label="Filter by status" className="admin-segments">
          {FILTERS.map((f) => {
            const n = f.key === "ALL" ? rows.length : rows.filter((r) => r.status === f.key).length;
            return (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="admin-segment">
                {f.label} <span className="font-mono text-[10px] text-label">{n}</span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          aria-label="Filter case studies"
          className="admin-field w-[min(260px,100%)]"
        />
      </div>

      <div className="overflow-x-auto border border-a-border bg-a-panel">
        <table className="admin-table min-w-[900px]">
          <thead>
            <tr>
              <th scope="col" className="w-[76px]">
                <span className="sr-only">Order</span>
              </th>
              <th scope="col">Project</th>
              <th scope="col">Client</th>
              <th scope="col">Industry</th>
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
            {visible.map((row, index) => (
              <tr
                key={row.id}
                draggable={canReorder}
                onDragStart={() => setDragging(row.id)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => canReorder && e.preventDefault()}
                onDrop={() => dropOn(row.id)}
                data-dragging={dragging === row.id || undefined}
              >
                <td>
                  {canReorder ? (
                    <span className="flex items-center gap-0.5">
                      <span aria-hidden="true" className="cursor-grab px-1 text-label" title="Drag to reorder">
                        ☰
                      </span>
                      <button
                        id={`move-${row.id}-up`}
                        type="button"
                        className="admin-icon-btn"
                        aria-label={`Move ${row.name} up`}
                        disabled={index === 0 || pending}
                        onClick={() => move(row.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        id={`move-${row.id}-down`}
                        type="button"
                        className="admin-icon-btn"
                        aria-label={`Move ${row.name} down`}
                        disabled={index === visible.length - 1 || pending}
                        onClick={() => move(row.id, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-label">{String(index + 1).padStart(2, "0")}</span>
                  )}
                </td>
                <td>
                  <Link href={`/admin/case-studies/${row.id}`} className="flex items-center gap-3 font-medium hover:text-acc">
                    <span className="admin-row-thumb" aria-hidden="true">
                      {row.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.thumb} alt="" className="size-full object-cover" />
                      ) : null}
                    </span>
                    {row.name}
                  </Link>
                </td>
                <td className="text-label">{row.client}</td>
                <td className="text-label">{row.industry}</td>
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
                    aria-label={`Featured on homepage: ${row.name}`}
                    disabled={!canPublish || pending}
                    onClick={() => run(() => toggleFeatured(row.id), row.featured ? "Removed from homepage" : "Featured on homepage")}
                  >
                    {row.featured ? "★" : "☆"}
                  </button>
                </td>
                <td className="font-mono text-[11px] text-label">{row.published}</td>
                <td className="font-mono text-[11px] text-label">{row.updated}</td>
                <td className="text-right whitespace-nowrap">
                  <Link href={`/admin/case-studies/${row.id}`} className="admin-row-action">
                    Edit
                  </Link>
                  <a href={`/api/admin/preview?path=/work/${row.slug}`} target="_blank" rel="noopener" className="admin-row-action">
                    Preview ↗<span className="sr-only"> {row.name} (opens in a new tab)</span>
                  </a>
                  <button type="button" className="admin-row-action" disabled={pending} onClick={() => run(() => duplicateCaseStudy(row.id), "Duplicated as a draft")}>
                    Duplicate
                  </button>
                  {canPublish ? (
                    <>
                      <button
                        type="button"
                        className="admin-row-action"
                        disabled={pending}
                        onClick={() =>
                          run(() => setPublished(row.id, row.status !== "PUBLISHED"), row.status === "PUBLISHED" ? "Unpublished" : "Published")
                        }
                      >
                        {row.status === "PUBLISHED" ? "Unpublish" : "Publish"}
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
          <p className="m-0 p-10 text-center text-label">
            {rows.length === 0 ? "No case studies yet. Create the first one to start the portfolio." : "Nothing matches this filter."}
          </p>
        ) : null}
      </div>
      <p className="mt-2.5 font-mono text-[10px] tracking-[0.06em] text-label">
        {canReorder ? "DRAG ☰ OR USE ↑↓ TO SET PUBLIC DISPLAY ORDER · " : ""}TRASHED ITEMS ARE KEPT 30 DAYS
      </p>

      {trashing ? (
        <ConfirmDialog
          title="Move to trash?"
          body={`“${trashing.name}” will be removed from the site and this list. It's kept for 30 days in case you need it back.`}
          cta="Move to trash"
          onCancel={() => setTrashing(null)}
          onConfirm={async () => {
            const result = await trashCaseStudy(trashing.id);
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
