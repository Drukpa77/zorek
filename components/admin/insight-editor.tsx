"use client";

import type { Status } from "@prisma/client";
import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import {
  type InsightIntent,
  listInsightVersions,
  loadInsightEditorState,
  restoreInsightVersion,
  saveInsight,
} from "@/app/admin/insights/actions";
import { Switch, TagInput, TextField } from "@/components/admin/fields";
import { MediaField } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ConfirmDialog, Toast, useToast } from "@/components/admin/ui";
import { useContentSave } from "@/components/admin/use-content-save";
import { SLUG_PATTERN, slugify } from "@/lib/case-study-schema";
import { statusColors, statusLabel } from "@/lib/content-status";
import type { VersionView } from "@/lib/content-versions";
import type { InsightData } from "@/lib/insight-schema";
import type { MediaView } from "@/lib/media-view";
import { wordCount } from "@/lib/rich-text";

type Props = {
  id: string;
  initial: InsightData;
  initialStatus: Status;
  initialUpdatedAt: string;
  initialMedia: Record<string, MediaView>;
  initialVersions: VersionView[];
  categories: { id: string; name: string }[];
  canPublish: boolean;
  siteHost: string;
};

// <input type="datetime-local"> works in the browser's local time.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function InsightEditor(props: Props) {
  const { id, canPublish } = props;
  const [draft, setDraft] = useState<InsightData>(props.initial);
  const [media, setMedia] = useState(props.initialMedia);
  const [versions, setVersions] = useState(props.initialVersions);
  const [restoring, setRestoring] = useState<VersionView | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const slugFollowsTitle = useRef(props.initialStatus === "DRAFT" && props.initial.slug.startsWith("untitled-article"));
  const { toast, notify } = useToast();
  const titleId = useId();
  const excerptId = useId();
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "local time";

  const { status, live, dirty, saveState, statusText, error, markDirty, save, reset } = useContentSave({
    draft,
    initialStatus: props.initialStatus,
    initialUpdatedAt: props.initialUpdatedAt,
    canPublish,
    send: (d, intent, base) => saveInsight(id, d, intent as InsightIntent, base),
    onSaved: async (result, intent) => {
      if (intent === "autosave") return;
      setVersions(await listInsightVersions(id));
      notify(
        intent === "draft"
          ? "Draft saved"
          : intent === "unpublish"
            ? "Unpublished — now a draft"
            : result.status === "SCHEDULED"
              ? "Scheduled"
              : intent === "publish"
                ? "Published"
                : "Changes are live",
      );
    },
  });

  const change = (patch: Partial<InsightData>) => {
    setDraft((d) => ({ ...d, ...patch }));
    markDirty();
  };
  const addMedia = useCallback((m: MediaView) => setMedia((all) => ({ ...all, [m.id]: m })), []);

  const scheduledFuture = Boolean(draft.publishAt && new Date(draft.publishAt) > new Date());
  const hero = draft.featuredImageId ? (media[draft.featuredImageId] ?? null) : null;
  const words = wordCount(draft.body);
  const run = async (intent: InsightIntent) => {
    const ok = await save(intent);
    if (!ok) notify("Not saved — see the message at the top.");
  };

  return (
    <>
      <div className="admin-editor-bar">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/insights" className="admin-btn-sm" aria-label="Back to insights">
            ←
          </Link>
          <div className="min-w-0">
            <p className="admin-eyebrow flex items-center gap-2">
              <span>Insight · /insights/{draft.slug}</span>
              <span className="admin-status" style={{ background: statusColors[status].bg, color: statusColors[status].fg }}>
                {statusLabel[status]}
              </span>
            </p>
            <h1 className="m-0 truncate text-[22px] font-semibold tracking-[-0.03em]">{draft.title || "Untitled article"}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.08em]" role="status" aria-live="polite">
            <span className="admin-save-state" data-state={saveState}>
              {statusText}
            </span>
          </span>
          <a href={`/api/admin/preview?path=/insights/${draft.slug}`} target="_blank" rel="noopener" className="admin-btn" title={dirty ? "Preview shows the last saved version" : undefined}>
            Preview ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
          {live ? (
            <>
              {canPublish ? (
                <button type="button" className="admin-btn" onClick={() => void run("unpublish")} disabled={saveState === "saving"}>
                  Unpublish
                </button>
              ) : null}
              <button type="button" className="admin-btn-accent" onClick={() => void run("update")} disabled={!canPublish || saveState === "saving" || !dirty}>
                {scheduledFuture ? "Update schedule" : "Update"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="admin-btn" onClick={() => void run("draft")} disabled={saveState === "saving"}>
                Save draft
              </button>
              <button
                type="button"
                className="admin-btn-accent"
                onClick={() => void run("publish")}
                disabled={!canPublish || saveState === "saving"}
                title={canPublish ? undefined : "Publishing needs an Editor or Admin"}
              >
                {scheduledFuture ? "Schedule" : "Publish"}
              </button>
            </>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="admin-notice mb-4 border-[#e7c9c2] bg-[#fdf5f3] text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
      {live && dirty ? (
        <p className="admin-notice mb-4">
          This article is {status === "SCHEDULED" ? "scheduled" : "live"}. Your changes stay in this tab until you press Update; they aren&rsquo;t autosaved.
        </p>
      ) : null}

      <div className="admin-insight-grid">
        <section className="admin-panel min-w-0" aria-label="Article">
          <div className="admin-canvas">
            <label htmlFor={titleId} className="sr-only">
              Title
            </label>
            <textarea
              id={titleId}
              rows={1}
              value={draft.title}
              maxLength={160}
              placeholder="Title"
              className="admin-canvas-title"
              onChange={(e) => {
                const title = e.target.value.replace(/\n/g, " ");
                change({ title, ...(slugFollowsTitle.current && slugify(title) ? { slug: slugify(title) } : {}) });
              }}
            />
            <label htmlFor={excerptId} className="sr-only">
              Excerpt
            </label>
            <textarea
              id={excerptId}
              rows={2}
              value={draft.excerpt}
              maxLength={300}
              placeholder="Excerpt — one or two sentences shown in lists and search results"
              className="admin-canvas-excerpt"
              onChange={(e) => change({ excerpt: e.target.value })}
            />
            <RichTextEditor
              key={editorKey}
              label="Article body"
              value={draft.body}
              onChange={(body) => change({ body })}
              media={media}
              addMedia={addMedia}
              placeholder="Write the article. Use H2 for sections — they become the table of contents."
              minHeight={420}
            />
            <p className="m-0 mt-3 font-mono text-[10px] text-label">
              {words} WORDS · ~{Math.max(1, Math.round(words / 230))} MIN READ
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="admin-panel flex flex-col gap-3 p-[18px]" aria-labelledby="settings-title">
            <h2 id="settings-title" className="admin-h2">
              Article settings
            </h2>
            <TextField
              label="Slug"
              value={draft.slug}
              max={80}
              mono
              error={SLUG_PATTERN.test(draft.slug) ? undefined : "Use lowercase letters, numbers and single hyphens."}
              onChange={(slug) => {
                slugFollowsTitle.current = false;
                change({ slug: slug.toLowerCase().replace(/\s+/g, "-") });
              }}
            />
            <CategorySelect value={draft.categoryId} categories={props.categories} onChange={(categoryId) => change({ categoryId })} />
            <TagInput label="Tags" value={draft.tags} onChange={(tags) => change({ tags })} max={10} />
            <PublishDate value={draft.publishAt} tz={tz} onChange={(publishAt) => change({ publishAt })} />
            <MediaField
              label="Featured image"
              kind="image"
              media={hero}
              onChange={(m) => {
                if (m) addMedia(m);
                change({ featuredImageId: m?.id ?? null });
              }}
            />
            <div className="border-t border-a-row pt-2.5">
              <Switch label="Featured (lead essay on the Insights page)" checked={draft.featured} onChange={(featured) => change({ featured })} disabled={!canPublish} />
            </div>
          </section>

          <section className="admin-panel flex flex-col gap-3 p-[18px]" aria-labelledby="iseo-title">
            <h2 id="iseo-title" className="admin-h2">
              SEO
            </h2>
            <TextField label="SEO title" value={draft.seo.title} max={70} counter={60} placeholder={draft.title} onChange={(title) => change({ seo: { ...draft.seo, title } })} />
            <TextField
              label="Meta description"
              value={draft.seo.description}
              max={200}
              counter={160}
              multiline
              placeholder="Defaults to the excerpt"
              onChange={(description) => change({ seo: { ...draft.seo, description } })}
            />
            <div className="admin-serp" aria-label="Search result preview">
              <span className="block font-mono text-[11px] text-[#1E6B3A]">
                {props.siteHost} › insights › {draft.slug}
              </span>
              <span className="mt-1 block text-[16px] text-[#2A1AA8]">{(draft.seo.title || draft.title).slice(0, 60)}</span>
              <span className="mt-1 block text-[12.5px] leading-[1.45] text-label">
                {(draft.seo.description || draft.excerpt || "Add an excerpt or meta description.").slice(0, 160)}
              </span>
            </div>
            <Switch label="Allow search engines to index" checked={!draft.seo.noindex} onChange={(index) => change({ seo: { ...draft.seo, noindex: !index } })} />
          </section>

          <section className="admin-panel p-[18px]" aria-labelledby="iversions-title">
            <h2 id="iversions-title" className="admin-h2 mb-2.5">
              Version history
            </h2>
            {versions.length === 0 ? (
              <p className="m-0 text-[12.5px] text-label">Versions are saved each time you save a draft, publish, schedule or update.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {versions.map((v, i) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 border-t border-a-row py-2 text-[13px]">
                    <span>
                      <span className="block">{v.when}</span>
                      <span className="font-mono text-[10px] text-label">
                        {v.label.toUpperCase()} · {v.by}
                        {i === 0 ? " · CURRENT" : ""}
                      </span>
                    </span>
                    {i > 0 && canPublish ? (
                      <button type="button" className="text-[12px] text-acc hover:underline" onClick={() => setRestoring(v)}>
                        Restore<span className="sr-only"> version from {v.when}</span>
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 mb-0 text-[12px] leading-[1.5] text-label">Workflow: Draft → Published. Review and approval steps switch on when more Editor and Author accounts are added.</p>
          </section>
        </div>
      </div>

      {restoring ? (
        <ConfirmDialog
          title="Restore this version?"
          tone="primary"
          body={`The content from ${restoring.when} (${restoring.label}) replaces what's in the editor. The current version is saved first, so you can switch back.${live ? " This article is live: the restored content goes live immediately." : ""}`}
          cta="Restore"
          onCancel={() => setRestoring(null)}
          onConfirm={async () => {
            const result = await restoreInsightVersion(id, restoring.id);
            setRestoring(null);
            if (!result.ok) return notify(result.error);
            const fresh = await loadInsightEditorState(id);
            if (fresh) {
              setDraft(fresh.data);
              setMedia((m) => ({ ...m, ...fresh.media }));
              setEditorKey((k) => k + 1); // remount the rich-text editor with the restored body
              reset({ status: fresh.status, updatedAt: fresh.updatedAt });
            }
            setVersions(await listInsightVersions(id));
            notify("Version restored");
          }}
        />
      ) : null}
      <Toast message={toast} />
    </>
  );
}

function CategorySelect({ value, categories, onChange }: { value: string | null; categories: { id: string; name: string }[]; onChange: (v: string | null) => void }) {
  const selectId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="admin-eyebrow">
        Category
      </label>
      <select id={selectId} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="admin-field">
        <option value="">{categories.length ? "—" : "No categories yet"}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PublishDate({ value, tz, onChange }: { value: string | null; tz: string; onChange: (iso: string | null) => void }) {
  const inputId = useId();
  const future = Boolean(value && new Date(value) > new Date());
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="admin-eyebrow">
        Publish date · schedule
      </label>
      <div className="flex gap-1.5">
        <input
          id={inputId}
          type="datetime-local"
          value={toLocalInput(value)}
          onChange={(e) => onChange(fromLocalInput(e.target.value))}
          aria-describedby={`${inputId}-hint`}
          className="admin-field min-w-0 flex-1"
        />
        {value ? (
          <button type="button" className="admin-btn-sm" onClick={() => onChange(null)}>
            Clear<span className="sr-only"> publish date</span>
          </button>
        ) : null}
      </div>
      <span id={`${inputId}-hint`} className="text-[11.5px] text-label">
        {future ? "A future date schedules the article; it goes live automatically." : "Leave empty to publish immediately."} Times are in {tz}.
      </span>
    </div>
  );
}
