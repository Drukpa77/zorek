"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchMedia } from "@/app/admin/media/actions";
import type { MediaView } from "@/lib/media";

type Kind = "image" | "video";

export function MediaPickerDialog({
  kind,
  onPick,
  onClose,
}: {
  kind: Kind;
  onPick: (media: MediaView) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaView[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([tabindex='-1']), a[href]")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await searchMedia(query, kind);
      if (!cancelled) setItems(result);
    }, query ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, kind]);

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: file,
        headers: { "X-Filename": encodeURIComponent(file.name) },
      });
      const json = (await response.json()) as { media?: MediaView; error?: string };
      if (!json.media) throw new Error(json.error ?? "The upload failed.");
      if (json.media.kind !== kind) throw new Error(`That's a ${json.media.kind}, but this field needs an ${kind}. It was added to the library.`);
      onPick(json.media);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-palette-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="admin-picker">
        <div className="flex items-center justify-between gap-3 border-b border-a-border px-4 py-3">
          <h2 id={titleId} className="admin-h2">
            Choose {kind === "video" ? "a video" : "an image"}
          </h2>
          <button type="button" className="admin-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-a-border px-4 py-3">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name or alt text…"
            aria-label="Search media"
            className="admin-field min-w-0 flex-1"
          />
          <button type="button" className="admin-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "↑ Upload new"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif,image/gif"}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </div>
        {error ? (
          <p role="alert" className="m-0 px-4 pt-3 text-[12.5px] text-[var(--destructive)]">
            {error}
          </p>
        ) : null}
        <div className="max-h-[55vh] overflow-y-auto p-4">
          {items === null ? (
            <p className="m-0 text-[13px] text-label" role="status">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="m-0 text-[13px] text-label" role="status">
              {query ? "No matches." : `No ${kind === "video" ? "videos" : "images"} yet. Upload one to use it here.`}
            </p>
          ) : (
            <ul className="admin-media-grid" aria-label="Media">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="admin-media-tile" onClick={() => onPick(item)}>
                    <span className="admin-media-thumb">
                      {item.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumb} alt="" loading="lazy" style={{ objectPosition: `${item.focalX * 100}% ${item.focalY * 100}%` }} />
                      ) : null}
                      <span className="admin-media-ext">{item.ext}</span>
                      {!item.alt && item.kind === "image" ? <span className="admin-media-flag">No alt</span> : null}
                    </span>
                    <span className="truncate px-2.5 py-2 text-left text-[12.5px]">{item.filename}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single media slot: preview, choose/change, remove. */
export function MediaField({
  label,
  kind,
  media,
  onChange,
  hint,
}: {
  label: string;
  kind: Kind;
  media: MediaView | null;
  onChange: (media: MediaView | null) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="admin-eyebrow">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <span className="admin-media-thumb w-[88px] shrink-0 border border-a-border" aria-hidden="true">
          {media?.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.thumb} alt="" style={{ objectPosition: `${media.focalX * 100}% ${media.focalY * 100}%` }} />
          ) : media ? (
            <span className="admin-media-ext">{media.ext}</span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[12.5px]">{media ? media.filename : "None selected"}</span>
          {media && media.kind === "image" && !media.alt ? <span className="text-[11.5px] text-[#8A5A00]">Missing alt text</span> : null}
          <span className="flex gap-1.5">
            <button type="button" className="admin-btn-sm" onClick={() => setOpen(true)}>
              {media ? "Change" : "Choose…"}
              <span className="sr-only"> {label}</span>
            </button>
            {media ? (
              <button type="button" className="admin-btn-sm" onClick={() => onChange(null)}>
                Remove<span className="sr-only"> {label}</span>
              </button>
            ) : null}
          </span>
        </span>
      </div>
      {hint ? <span className="text-[11.5px] text-label">{hint}</span> : null}
      {open ? (
        <MediaPickerDialog
          kind={kind}
          onClose={() => setOpen(false)}
          onPick={(picked) => {
            onChange(picked);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
