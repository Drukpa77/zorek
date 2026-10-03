"use client";

import type { Status } from "@prisma/client";
import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { listVersions, loadEditorState, restoreVersion, saveCaseStudy, type SaveIntent } from "@/app/admin/case-studies/actions";
import type { VersionView } from "@/lib/content-versions";
import { setMediaFocalPoint } from "@/app/admin/media/actions";
import { BlockBuilder, type EditorBlock } from "@/components/admin/block-builder";
import { ChipGroup, Switch, TextField } from "@/components/admin/fields";
import { MediaField } from "@/components/admin/media-picker";
import { ConfirmDialog, Toast, useToast } from "@/components/admin/ui";
import { useContentSave } from "@/components/admin/use-content-save";
import { type CaseStudyData, PROJECT_TYPES, SLUG_PATTERN, slugify, statusColors, statusLabel } from "@/lib/case-study-schema";
import type { MediaView } from "@/lib/media";

type Props = {
  id: string;
  initial: CaseStudyData;
  initialStatus: Status;
  initialUpdatedAt: string;
  initialMedia: Record<string, MediaView>;
  initialVersions: VersionView[];
  industries: { id: string; name: string }[];
  services: { id: string; name: string }[];
  serviceOptions: string[];
  technologyOptions: string[];
  canPublish: boolean;
  siteHost: string;
};

type Draft = Omit<CaseStudyData, "blocks"> & { blocks: EditorBlock[] };

const toDraft = (data: CaseStudyData): Draft => ({
  ...data,
  blocks: data.blocks.map((b) => ({ key: b.id ?? `new-${crypto.randomUUID()}`, type: b.type, hidden: b.hidden, data: b.data as Record<string, unknown> })),
});

const toInput = (draft: Draft) => ({ ...draft, blocks: draft.blocks.map(({ type, hidden, data }) => ({ type, hidden, data })) });

export function CaseStudyEditor(props: Props) {
  const { id, canPublish } = props;
  const [draft, setDraft] = useState<Draft>(() => toDraft(props.initial));
  const [media, setMedia] = useState<Record<string, MediaView>>(props.initialMedia);
  const [versions, setVersions] = useState(props.initialVersions);
  const [restoring, setRestoring] = useState<VersionView | null>(null);
  // A fresh, never-published draft's slug follows the name until someone
  // edits the slug by hand.
  const slugFollowsName = useRef(props.initialStatus === "DRAFT" && props.initial.slug.startsWith("untitled-case-study"));
  const { toast, notify } = useToast();

  const { status, live, dirty, saveState, statusText, error, markDirty, save, reset } = useContentSave({
    draft,
    initialStatus: props.initialStatus,
    initialUpdatedAt: props.initialUpdatedAt,
    canPublish,
    send: (d, intent, base) => saveCaseStudy(id, toInput(d), intent as SaveIntent, base),
    onSaved: async (_result, intent) => {
      if (intent === "autosave") return;
      setVersions(await listVersions(id));
      notify({ draft: "Draft saved", publish: "Published", update: "Changes are live", unpublish: "Unpublished — now a draft" }[intent]);
    },
  });

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    markDirty();
  };

  const addMedia = useCallback((m: MediaView) => setMedia((all) => ({ ...all, [m.id]: m })), []);

  const hero = draft.heroImageId ? (media[draft.heroImageId] ?? null) : null;
  const slugError = SLUG_PATTERN.test(draft.slug) ? undefined : "Use lowercase letters, numbers and single hyphens.";
  const previewHref = `/api/admin/preview?path=/work/${draft.slug}`;

  return (
    <>
      <div className="admin-editor-bar">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/case-studies" className="admin-btn-sm" aria-label="Back to case studies">
            ←
          </Link>
          <div className="min-w-0">
            <p className="admin-eyebrow flex items-center gap-2">
              <span>Case study · /work/{draft.slug}</span>
              <span className="admin-status" style={{ background: statusColors[status].bg, color: statusColors[status].fg }}>
                {statusLabel[status]}
              </span>
            </p>
            <h1 className="m-0 truncate text-[22px] font-semibold tracking-[-0.03em]">{draft.name || "Untitled case study"}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.08em]" data-state={saveState} role="status" aria-live="polite">
            <span className="admin-save-state" data-state={saveState}>
              {statusText}
            </span>
          </span>
          <a href={previewHref} target="_blank" rel="noopener" className="admin-btn" title={dirty ? "Preview shows the last saved version" : undefined}>
            Preview ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
          {live ? (
            <>
              {canPublish ? (
                <button type="button" className="admin-btn" onClick={() => void save("unpublish")} disabled={saveState === "saving"}>
                  Unpublish
                </button>
              ) : null}
              <button
                type="button"
                className="admin-btn-accent"
                onClick={() => void save("update")}
                disabled={!canPublish || saveState === "saving" || !dirty}
                title={canPublish ? undefined : "Publishing needs an Editor or Admin"}
              >
                Update
              </button>
            </>
          ) : (
            <>
              <button type="button" className="admin-btn" onClick={() => void save("draft")} disabled={saveState === "saving"}>
                Save draft
              </button>
              <button
                type="button"
                className="admin-btn-accent"
                onClick={() => void save("publish")}
                disabled={!canPublish || saveState === "saving"}
                title={canPublish ? undefined : "Publishing needs an Editor or Admin"}
              >
                Publish
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
        <p className="admin-notice mb-4">This case study is live. Your changes are kept in this tab until you press Update; they aren&rsquo;t autosaved.</p>
      ) : null}

      <div className="admin-editor-grid">
        {/* ---- Details ---- */}
        <section className="admin-panel flex flex-col gap-3.5 p-[18px]" aria-labelledby="details-title">
          <h2 id="details-title" className="admin-h2">
            Project details
          </h2>
          <TextField
            label="Project name"
            value={draft.name}
            max={120}
            onChange={(name) => change({ name, ...(slugFollowsName.current && slugify(name) ? { slug: slugify(name) } : {}) })}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <TextField label="Client" value={draft.clientName} max={120} placeholder="[Client name]" onChange={(clientName) => change({ clientName })} />
            <TextField label="Slug" value={draft.slug} max={80} mono error={slugError} onChange={(slug) => {
                slugFollowsName.current = false;
                change({ slug: slug.toLowerCase().replace(/\s+/g, "-") });
              }}
            />
          </div>
          <TextField label="Short description" value={draft.shortDescription} max={400} counter={200} multiline onChange={(shortDescription) => change({ shortDescription })} />
          <div className="grid grid-cols-2 gap-2.5">
            <NumberField label="Year" value={draft.year} onChange={(year) => change({ year })} />
            <Select
              label="Industry"
              value={draft.industryId ?? ""}
              onChange={(v) => change({ industryId: v || null })}
              options={[{ value: "", label: props.industries.length ? "—" : "No industries yet" }, ...props.industries.map((i) => ({ value: i.id, label: i.name }))]}
            />
          </div>
          <Select
            label="Project type · drives the Work filters"
            value={draft.projectType ?? ""}
            onChange={(v) => change({ projectType: (v || null) as Draft["projectType"] })}
            options={[{ value: "", label: "—" }, ...PROJECT_TYPES.map((t) => ({ value: t, label: t }))]}
          />
          <ChipGroup label="Services provided" options={props.serviceOptions} value={draft.services} onChange={(services) => change({ services })} allowCustom max={12} />
          <ChipGroup
            label="Technologies · only what genuinely applies"
            options={props.technologyOptions}
            value={draft.technologies}
            onChange={(technologies) => change({ technologies })}
            allowCustom
            max={20}
          />
          <div className="border-t border-a-row pt-2.5">
            <Switch label="Featured on homepage" checked={draft.featured} onChange={(featured) => change({ featured })} disabled={!canPublish} />
          </div>
          <div className="flex flex-col gap-2 border-t border-a-row pt-2.5">
            <MediaField
              label="Hero image"
              kind="image"
              media={hero}
              onChange={(m) => {
                if (m) addMedia(m);
                change({ heroImageId: m?.id ?? null });
              }}
            />
            {hero ? <HeroFocal media={hero} onMoved={addMedia} notify={notify} /> : null}
          </div>
        </section>

        {/* ---- Builder ---- */}
        <BlockBuilder blocks={draft.blocks} onChange={(blocks) => change({ blocks })} ctx={{ media, addMedia, services: props.services }} />

        {/* ---- SEO + versions ---- */}
        <div className="flex flex-col gap-5">
          <section className="admin-panel flex flex-col gap-3 p-[18px]" aria-labelledby="seo-title">
            <h2 id="seo-title" className="admin-h2">
              SEO
            </h2>
            <TextField
              label="SEO title"
              value={draft.seo.title}
              max={70}
              counter={60}
              placeholder={`${draft.name} — Case study`}
              onChange={(title) => change({ seo: { ...draft.seo, title } })}
            />
            <TextField
              label="Meta description"
              value={draft.seo.description}
              max={200}
              counter={160}
              multiline
              placeholder="Defaults to the short description"
              onChange={(description) => change({ seo: { ...draft.seo, description } })}
            />
            <div className="admin-serp" aria-label="Search result preview">
              <span className="block font-mono text-[11px] text-[#1E6B3A]">
                {props.siteHost} › work › {draft.slug}
              </span>
              <span className="mt-1 block text-[16px] text-[#2A1AA8]">{(draft.seo.title || `${draft.name} — Case study`).slice(0, 60)}</span>
              <span className="mt-1 block text-[12.5px] leading-[1.45] text-label">
                {(draft.seo.description || draft.shortDescription || "Add a short description or meta description.").slice(0, 160)}
              </span>
            </div>
            <Switch
              label="Allow search engines to index"
              checked={!draft.seo.noindex}
              onChange={(index) => change({ seo: { ...draft.seo, noindex: !index } })}
            />
          </section>

          <section className="admin-panel p-[18px]" aria-labelledby="versions-title">
            <h2 id="versions-title" className="admin-h2 mb-2.5">
              Version history
            </h2>
            {versions.length === 0 ? (
              <p className="m-0 text-[12.5px] text-label">Versions are saved each time you save a draft, publish or update.</p>
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
          </section>
        </div>
      </div>

      {restoring ? (
        <ConfirmDialog
          title="Restore this version?"
          tone="primary"
          body={`The content from ${restoring.when} (${restoring.label}) replaces what's in the editor. The current version is saved first, so you can switch back.${live ? " This page is live: the restored content goes live immediately." : ""}`}
          cta="Restore"
          onCancel={() => setRestoring(null)}
          onConfirm={async () => {
            const result = await restoreVersion(id, restoring.id);
            setRestoring(null);
            if (!result.ok) return notify(result.error);
            const fresh = await loadEditorState(id);
            if (fresh) {
              setDraft(toDraft(fresh.data));
              setMedia((m) => ({ ...m, ...fresh.media }));
              reset({ status: fresh.status, updatedAt: fresh.updatedAt });
            }
            setVersions(await listVersions(id));
            notify("Version restored");
          }}
        />
      ) : null}
      <Toast message={toast} />
    </>
  );
}

function HeroFocal({ media, onMoved, notify }: { media: MediaView; onMoved: (m: MediaView) => void; notify: (m: string) => void }) {
  const [focal, setFocal] = useState({ x: media.focalX, y: media.focalY });
  const timer = useRef(0);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const move = (x: number, y: number) => {
    const next = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    setFocal(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const result = await setMediaFocalPoint({ id: media.id, ...next });
      if (!result.ok) notify(result.error);
      else onMoved({ ...media, focalX: next.x, focalY: next.y });
    }, 400);
  };
  const position = `${pct(focal.x)} ${pct(focal.y)}`;
  return (
    <>
      <div
        className="admin-focal aspect-video"
        role="group"
        tabIndex={0}
        aria-label={`Hero focal point ${pct(focal.x)} across, ${pct(focal.y)} down. Click or use the arrow keys. Applies everywhere this image is used.`}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          move((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        }}
        onKeyDown={(e) => {
          const s = e.shiftKey ? 0.1 : 0.02;
          const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
          if (!d[e.key]) return;
          e.preventDefault();
          move(focal.x + d[e.key][0], focal.y + d[e.key][1]);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.thumb ?? media.url} alt="" className="object-cover" style={{ objectFit: "cover" }} />
        <span aria-hidden="true" className="admin-focal-ring" style={{ left: pct(focal.x), top: pct(focal.y) }} />
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-label="Crop previews">
        {[
          { label: "1:1 card", ratio: "1 / 1" },
          { label: "4:5 mobile", ratio: "4 / 5" },
          { label: "3:1 banner", ratio: "3 / 1" },
        ].map((crop) => (
          <figure key={crop.label} className="m-0 flex flex-col gap-1">
            <span className="admin-crop" style={{ aspectRatio: crop.ratio }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.thumb ?? media.url} alt="" style={{ objectPosition: position }} />
            </span>
            <figcaption className="font-mono text-[9px] text-label">{crop.label}</figcaption>
          </figure>
        ))}
      </div>
      <span className="text-[11.5px] text-label">Crops for card, mobile and banner are made around this point.</span>
    </>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="admin-eyebrow">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="admin-field min-w-0">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const id = useId();
  const [text, setText] = useState(value?.toString() ?? "");
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="admin-eyebrow">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        value={text}
        maxLength={4}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          setText(next);
          const n = Number(next);
          onChange(next.length === 4 && n >= 1990 && n <= 2100 ? n : null);
        }}
        className="admin-field min-w-0"
        placeholder="2026"
      />
    </div>
  );
}
