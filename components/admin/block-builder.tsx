"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MediaField, MediaPickerDialog } from "@/components/admin/media-picker";
import { ChipGroup, Switch, TagInput, TextField } from "@/components/admin/fields";
import { ConfirmDialog } from "@/components/admin/ui";
import { type BlockType, blockDefs, blockTypes, defaultBlockData, type Field } from "@/lib/blocks";
import type { MediaView } from "@/lib/media";
import { docToText, textToDoc } from "@/lib/rich-text";

export type EditorBlock = { key: string; type: BlockType; hidden: boolean; data: Record<string, unknown> };

type Ctx = {
  media: Record<string, MediaView>;
  addMedia: (media: MediaView) => void;
  services: { id: string; name: string }[];
};

const newKey = () => `new-${crypto.randomUUID()}`;

export function BlockBuilder({
  blocks,
  onChange,
  ctx,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  ctx: Ctx;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<EditorBlock | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const pickerId = useId();

  // After adding or moving a block, put focus where the user expects it.
  useEffect(() => {
    if (!focusKey) return;
    const el = document.querySelector<HTMLElement>(`[data-block-focus="${focusKey}"]`);
    el?.focus();
    setFocusKey(null);
  }, [focusKey, blocks]);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const update = (key: string, change: Partial<EditorBlock>) => onChange(blocks.map((b) => (b.key === key ? { ...b, ...change } : b)));

  const move = (key: string, delta: number) => {
    const from = blocks.findIndex((b) => b.key === key);
    const to = from + delta;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`block-${key}-${delta < 0 ? "up" : "down"}`)?.focus());
  };

  const add = (type: BlockType) => {
    const block: EditorBlock = { key: newKey(), type, hidden: false, data: defaultBlockData(type) };
    onChange([...blocks, block]);
    setOpen((current) => new Set(current).add(block.key));
    setAdding(false);
    setFocusKey(block.key);
  };

  const duplicate = (block: EditorBlock) => {
    const index = blocks.findIndex((b) => b.key === block.key);
    const copy = { ...block, key: newKey(), data: structuredClone(block.data) };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setFocusKey(copy.key);
  };

  const dropOn = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const item = blocks.find((b) => b.key === dragKey);
    if (!item) return;
    const next = blocks.filter((b) => b.key !== dragKey);
    next.splice(next.findIndex((b) => b.key === targetKey), 0, item);
    setDragKey(null);
    onChange(next);
  };

  return (
    <section className="admin-panel flex flex-col gap-3 p-[18px]" aria-labelledby="builder-title">
      <div className="flex items-center justify-between">
        <h2 id="builder-title" className="admin-h2">
          Page builder
        </h2>
        <span className="font-mono text-[10px] text-label">{blocks.length} BLOCKS</span>
      </div>
      <p className="m-0 text-[12.5px] leading-[1.5] text-label">You control content and order. The design system controls presentation.</p>

      {blocks.length === 0 ? (
        <p className="m-0 rounded-[4px] border border-dashed border-a-input p-4 text-center text-[13px] text-label">
          No blocks yet. Add the first one below. Most case studies start with Rich text blocks for the client, challenge and solution.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Blocks">
          {blocks.map((block, index) => {
            const def = blockDefs[block.type];
            const expanded = open.has(block.key);
            const panelId = `block-panel-${block.key}`;
            return (
              <li
                key={block.key}
                className="admin-block"
                data-hidden={block.hidden || undefined}
                data-dragging={dragKey === block.key || undefined}
                draggable
                onDragStart={(e) => {
                  // Only drag from the handle row, never while editing a field.
                  if ((e.target as HTMLElement).closest("input, textarea, select")) return e.preventDefault();
                  setDragKey(block.key);
                }}
                onDragEnd={() => setDragKey(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(block.key)}
              >
                <div className="admin-block-head">
                  <span aria-hidden="true" className="cursor-grab text-label" title="Drag to reorder">
                    ☰
                  </span>
                  <button
                    type="button"
                    className="flex min-w-0 flex-col text-left"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    data-block-focus={block.key}
                    onClick={() => toggle(block.key)}
                  >
                    <span className="truncate font-medium">
                      <span className="sr-only">Block {index + 1}: </span>
                      {def.summary(block.data)}
                    </span>
                    <span className="font-mono text-[10px] text-label">
                      {def.label}
                      {block.hidden ? " · HIDDEN" : ""}
                    </span>
                  </button>
                  <span className="flex gap-0.5">
                    <button id={`block-${block.key}-up`} type="button" className="admin-icon-btn" aria-label={`Move block ${index + 1} up`} disabled={index === 0} onClick={() => move(block.key, -1)}>
                      ↑
                    </button>
                    <button
                      id={`block-${block.key}-down`}
                      type="button"
                      className="admin-icon-btn"
                      aria-label={`Move block ${index + 1} down`}
                      disabled={index === blocks.length - 1}
                      onClick={() => move(block.key, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn text-[11px]"
                      aria-pressed={block.hidden}
                      aria-label={`Hide block ${index + 1} on the site`}
                      title={block.hidden ? "Hidden on the site" : "Visible on the site"}
                      onClick={() => update(block.key, { hidden: !block.hidden })}
                    >
                      {block.hidden ? "◌" : "●"}
                    </button>
                    <button type="button" className="admin-icon-btn" aria-label={`Duplicate block ${index + 1}`} onClick={() => duplicate(block)}>
                      ⧉
                    </button>
                    <button type="button" className="admin-icon-btn text-[var(--destructive)]" aria-label={`Remove block ${index + 1}`} onClick={() => setRemoving(block)}>
                      ×
                    </button>
                  </span>
                </div>
                {expanded ? (
                  <div id={panelId} className="admin-block-body">
                    {def.fields.map((field) => (
                      <FieldInput
                        key={field.name}
                        field={field}
                        value={block.data[field.name]}
                        onChange={(value) => update(block.key, { data: { ...block.data, [field.name]: value } })}
                        ctx={ctx}
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <button type="button" className="admin-add-block" aria-expanded={adding} aria-controls={pickerId} onClick={() => setAdding((v) => !v)}>
          + Add block
        </button>
        {adding ? (
          <ul id={pickerId} className="admin-block-picker" aria-label="Block types">
            {blockTypes.map((type) => (
              <li key={type}>
                <button type="button" onClick={() => add(type)}>
                  {blockDefs[type].label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {removing ? (
        <ConfirmDialog
          title="Remove this block?"
          body={`“${blockDefs[removing.type].summary(removing.data)}” will be removed from the page. You can undo this by restoring an earlier version.`}
          cta="Remove block"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            onChange(blocks.filter((b) => b.key !== removing.key));
            setRemoving(null);
          }}
        />
      ) : null}
    </section>
  );
}

// ---------- Fields ----------

function RichField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: unknown) => void }) {
  // Keep the typed text locally so formatting round-trips never fight the cursor.
  const [text, setText] = useState(() => docToText(value));
  return (
    <TextField
      label={label}
      value={text}
      multiline
      rows={6}
      max={20000}
      hint="Blank line starts a new paragraph · “- ” makes a bullet · “## ” makes a subheading"
      onChange={(next) => {
        setText(next);
        onChange(textToDoc(next));
      }}
    />
  );
}

function MediaListField({ label, value, onChange, ctx }: { label: string; value: string[]; onChange: (v: string[]) => void; ctx: Ctx }) {
  const [picking, setPicking] = useState(false);
  const labelId = useId();
  const move = (i: number, d: number) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(i + d, 0, item);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="admin-eyebrow">
        {label} · {value.length}
      </span>
      {value.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5 p-0">
          {value.map((mediaId, i) => {
            const m = ctx.media[mediaId];
            return (
              <li key={`${mediaId}-${i}`} className="flex flex-col gap-1">
                <span className="admin-media-thumb border border-a-border">
                  {m?.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumb} alt={m.alt || m.filename} />
                  ) : (
                    <span className="admin-media-ext">Missing</span>
                  )}
                </span>
                <span className="flex justify-between">
                  <button type="button" className="admin-icon-btn" aria-label={`Move image ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ←
                  </button>
                  <button type="button" className="admin-icon-btn text-[var(--destructive)]" aria-label={`Remove image ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                    ×
                  </button>
                  <button type="button" className="admin-icon-btn" aria-label={`Move image ${i + 1} later`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                    →
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <button type="button" className="admin-btn-sm self-start" onClick={() => setPicking(true)} disabled={value.length >= 24}>
        + Add image
      </button>
      {picking ? (
        <MediaPickerDialog
          kind="image"
          onClose={() => setPicking(false)}
          onPick={(m) => {
            ctx.addMedia(m);
            onChange([...value, m.id]);
            setPicking(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ListField({ field, value, onChange, ctx }: { field: Extract<Field, { kind: "list" }>; value: Record<string, unknown>[]; onChange: (v: unknown) => void; ctx: Ctx }) {
  const blank = () => Object.fromEntries(field.fields.map((f) => [f.name, f.kind === "tags" ? [] : f.kind === "media" ? null : ""]));
  const labelId = useId();
  const addRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="admin-eyebrow">
        {field.label} · {value.length}
      </span>
      {value.map((item, i) => (
        <fieldset key={i} className="admin-list-item">
          <legend className="sr-only">
            {field.itemLabel} {i + 1}
          </legend>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-label" aria-hidden="true">
              {field.itemLabel.toUpperCase()} {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex gap-0.5">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label={`Move ${field.itemLabel.toLowerCase()} ${i + 1} up`}
                disabled={i === 0}
                onClick={() => {
                  const next = [...value];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-icon-btn text-[var(--destructive)]"
                aria-label={`Remove ${field.itemLabel.toLowerCase()} ${i + 1}`}
                onClick={() => {
                  onChange(value.filter((_, j) => j !== i));
                  addRef.current?.focus();
                }}
              >
                ×
              </button>
            </span>
          </div>
          {field.fields.map((sub) => (
            <FieldInput
              key={sub.name}
              field={sub}
              value={item[sub.name]}
              onChange={(v) => onChange(value.map((it, j) => (j === i ? { ...it, [sub.name]: v } : it)))}
              ctx={ctx}
            />
          ))}
        </fieldset>
      ))}
      <button ref={addRef} type="button" className="admin-btn-sm self-start" disabled={value.length >= field.max} onClick={() => onChange([...value, blank()])}>
        + Add {field.itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange, ctx }: { field: Field; value: unknown; onChange: (value: unknown) => void; ctx: Ctx }) {
  switch (field.kind) {
    case "text":
      return <TextField label={field.label} value={String(value ?? "")} onChange={onChange} max={field.max} placeholder={field.placeholder} hint={field.hint} />;
    case "textarea":
      return <TextField label={field.label} value={String(value ?? "")} onChange={onChange} max={field.max} hint={field.hint} multiline />;
    case "rich":
      return <RichField label={field.label} value={value} onChange={onChange} />;
    case "media": {
      const media = typeof value === "string" ? (ctx.media[value] ?? null) : null;
      return (
        <MediaField
          label={field.label}
          kind={field.accept}
          media={media}
          hint={typeof value === "string" && !media ? "The selected file is no longer in the library." : field.hint}
          onChange={(m) => {
            if (m) ctx.addMedia(m);
            onChange(m?.id ?? null);
          }}
        />
      );
    }
    case "mediaList":
      return <MediaListField label={field.label} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} ctx={ctx} />;
    case "select":
      return <SelectField field={field} value={String(value ?? "")} onChange={onChange} />;
    case "toggle":
      return <Switch label={field.label} hint={field.hint} checked={Boolean(value)} onChange={onChange} />;
    case "tags":
      return <TagInput label={field.label} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} max={field.max} hint={field.hint} />;
    case "services":
      return ctx.services.length ? (
        <ChipGroup
          label={field.label}
          options={ctx.services.map((s) => s.name)}
          value={(Array.isArray(value) ? (value as string[]) : []).map((id) => ctx.services.find((s) => s.id === id)?.name).filter((n): n is string => Boolean(n))}
          onChange={(names) => onChange(names.map((n) => ctx.services.find((s) => s.name === n)?.id).filter(Boolean))}
        />
      ) : (
        <p className="m-0 text-[12.5px] text-label">No services exist yet. They&rsquo;ll be selectable here once the Services screen is built.</p>
      );
    case "list":
      return <ListField field={field} value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []} onChange={onChange} ctx={ctx} />;
  }
}

function SelectField({ field, value, onChange }: { field: Extract<Field, { kind: "select" }>; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="admin-eyebrow">
        {field.label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="admin-field">
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
