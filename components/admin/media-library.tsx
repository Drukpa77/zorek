"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { setMediaFocalPoint, trashMedia, updateMediaDetails } from "@/app/admin/media/actions";
import { ConfirmDialog, Toast, useToast } from "@/components/admin/ui";
import type { MediaView } from "@/lib/media";

type Props = {
  items: MediaView[];
  total: number;
  query: string;
  initialId: string | null;
  accept: string;
  canDelete: boolean;
  storageReady: boolean;
};

type Upload = { id: string; name: string; progress: number; status: "queued" | "uploading" | "processing" | "done" | "error"; error?: string };

const CONCURRENCY = 2;

// XHR, not fetch: fetch still has no upload progress events.
function send(file: File, replaceId: string | null, onProgress: (fraction: number) => void) {
  return new Promise<{ media?: MediaView; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/media${replaceId ? `?replace=${encodeURIComponent(replaceId)}` : ""}`);
    xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve({ error: xhr.status === 413 ? "That file is too large." : "The upload failed. Please try again." });
      }
    };
    xhr.onerror = () => resolve({ error: "Network error. Check your connection and try again." });
    xhr.send(file);
  });
}

export function MediaLibrary({ items: serverItems, total, query, initialId, accept, canDelete, storageReady }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // Uploads appear immediately from the API response; the server refresh that
  // follows replaces them with the canonical list.
  const [fresh, setFresh] = useState<MediaView[]>([]);
  useEffect(() => setFresh([]), [serverItems]);
  const items = [
    ...fresh.filter((f) => !serverItems.some((s) => s.id === f.id)),
    ...serverItems.map((s) => fresh.find((f) => f.id === s.id) ?? s),
  ];
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? items[0]?.id ?? null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState(query);
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const { toast, notify } = useToast();

  // Search lives in the URL so results are shareable and survive refresh.
  useEffect(() => {
    if (search.trim() === query) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, query, pathname, router]);

  const select = (id: string) => {
    setSelectedId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("id", id);
    window.history.replaceState(null, "", `${pathname}?${params}`);
  };

  const patch = (id: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((upload) => (upload.id === id ? { ...upload, ...change } : upload)));

  const uploadFiles = async (files: File[], replaceId: string | null = null) => {
    if (!storageReady || files.length === 0) return;
    const batch = files.map((file) => ({ file, entry: { id: crypto.randomUUID(), name: file.name, progress: 0, status: "queued" as const } }));
    setUploads((list) => [...batch.map((b) => b.entry), ...list].slice(0, 20));

    let lastId: string | null = null;
    let failed = 0;
    const queue = [...batch];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { file, entry } = next;
        patch(entry.id, { status: "uploading" });
        const result = await send(file, replaceId, (fraction) =>
          patch(entry.id, { progress: fraction, status: fraction >= 1 ? "processing" : "uploading" }),
        );
        if (result.media) {
          const media = result.media;
          lastId = media.id;
          setFresh((list) => [media, ...list.filter((f) => f.id !== media.id)]);
          patch(entry.id, { status: "done", progress: 1 });
        } else {
          failed++;
          patch(entry.id, { status: "error", error: result.error ?? "The upload failed." });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker));

    router.refresh();
    if (lastId) select(lastId);
    const ok = batch.length - failed;
    if (replaceId) notify(failed ? "Replace failed" : "File replaced");
    else notify(failed ? `${ok} uploaded, ${failed} failed` : `${ok} ${ok === 1 ? "file" : "files"} uploaded`);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void uploadFiles([...event.dataTransfer.files]);
  };

  const active = uploads.filter((u) => u.status !== "done");

  return (
    <div
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow mb-2">Media library · Object storage</p>
          <h1 className="admin-h1 text-[clamp(28px,3vw,38px)]">Media</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files…"
            aria-label="Search media"
            className="admin-field w-[220px] max-w-full"
          />
          <button type="button" className="admin-btn-primary" onClick={() => fileInput.current?.click()} disabled={!storageReady}>
            ↑ Upload
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={accept}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void uploadFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <input
            ref={replaceInput}
            type="file"
            accept={accept}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && selected) void uploadFiles([file], selected.id);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {!storageReady ? (
        <p role="alert" className="admin-notice mb-4">
          File storage isn&rsquo;t configured on this server. Set STORAGE_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID and
          S3_SECRET_ACCESS_KEY to enable uploads.
        </p>
      ) : (
        <div className="admin-dropzone mb-4" data-dragging={dragging || undefined}>
          Drag &amp; drop files anywhere here, or{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => fileInput.current?.click()}>
            browse
          </button>
          {" · "}JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, PDF · sizes generated automatically
        </div>
      )}

      {uploads.length > 0 ? (
        <ul className="admin-uploads mb-4" aria-label="Uploads">
          {uploads.map((upload) => (
            <li key={upload.id} className="admin-upload" data-status={upload.status}>
              <span className="truncate text-[13px]">{upload.name}</span>
              {upload.status === "error" ? (
                <span className="text-[12px] text-[var(--destructive)]">{upload.error}</span>
              ) : (
                <span className="font-mono text-[10px] text-label uppercase">
                  {upload.status === "processing"
                    ? "Processing…"
                    : upload.status === "done"
                      ? "Done"
                      : upload.status === "queued"
                        ? "Queued"
                        : `${Math.round(upload.progress * 100)}%`}
                </span>
              )}
              <span
                className="admin-upload-bar"
                role="progressbar"
                aria-label={`Uploading ${upload.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(upload.progress * 100)}
              >
                <span style={{ width: `${upload.progress * 100}%` }} />
              </span>
            </li>
          ))}
          {active.length === 0 ? (
            <li className="flex justify-end">
              <button type="button" className="text-[12px] text-label hover:text-ink" onClick={() => setUploads([])}>
                Clear list
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {items.length === 0 ? (
        <p className="admin-empty admin-panel">
          {query ? `No files match “${query}”.` : "No files yet. Upload images, video or PDFs to use them across the site."}
        </p>
      ) : (
        <div className="admin-media-layout">
          <div>
            <p className="admin-eyebrow mb-3">
              {query
                ? `${items.length} of ${total} files`
                : `${Math.max(total, items.length)} ${Math.max(total, items.length) === 1 ? "file" : "files"}`}
            </p>
            <ul className="admin-media-grid" aria-label="Files">
              {items.map((item) => {
                const on = selected?.id === item.id;
                return (
                  <li key={item.id}>
                    <button type="button" className="admin-media-tile" aria-pressed={on} onClick={() => select(item.id)}>
                      <span className="admin-media-thumb">
                        {item.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            style={{ objectPosition: `${item.focalX * 100}% ${item.focalY * 100}%` }}
                          />
                        ) : null}
                        <span className="admin-media-ext">{item.ext}</span>
                        {!item.alt && item.kind === "image" ? <span className="admin-media-flag">No alt</span> : null}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5 px-2.5 py-2 text-left">
                        <span className="truncate text-[12.5px]">{item.filename}</span>
                        <span className="font-mono text-[10px] text-label">
                          {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                          {item.size}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <MediaDetail
              key={selected.id}
              item={selected}
              canDelete={canDelete}
              storageReady={storageReady}
              onReplace={() => replaceInput.current?.click()}
              onDelete={() => setConfirming(true)}
              notify={notify}
            />
          ) : null}
        </div>
      )}

      {confirming && selected ? (
        <ConfirmDialog
          title="Move to trash?"
          body={`“${selected.filename}” will be removed from the library. It stays in storage for 30 days, so pages already using it keep working until then.`}
          cta="Move to trash"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            const result = await trashMedia(selected.id);
            setConfirming(false);
            if (!result.ok) return notify(result.error);
            setSelectedId(null);
            router.refresh();
            notify("Moved to trash");
          }}
        />
      ) : null}

      <Toast message={toast} />
    </div>
  );
}

function MediaDetail({
  item,
  canDelete,
  storageReady,
  onReplace,
  onDelete,
  notify,
}: {
  item: MediaView;
  canDelete: boolean;
  storageReady: boolean;
  onReplace: () => void;
  onDelete: () => void;
  notify: (message: string) => void;
}) {
  const router = useRouter();
  const [alt, setAlt] = useState(item.alt);
  const [caption, setCaption] = useState(item.caption);
  const [focal, setFocal] = useState({ x: item.focalX, y: item.focalY });
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const focalTimer = useRef(0);
  // What the server last accepted; the item prop lags until the refresh lands.
  const lastSaved = useRef({ alt: item.alt, caption: item.caption });
  const altId = useId();

  const saveDetails = async () => {
    const next = { alt: alt.trim(), caption: caption.trim() };
    if (next.alt === lastSaved.current.alt && next.caption === lastSaved.current.caption) return;
    lastSaved.current = next;
    setSaved("saving");
    const result = await updateMediaDetails({ id: item.id, ...next });
    if (result.ok) {
      setSaved("saved");
      setError("");
      router.refresh();
    } else {
      lastSaved.current = { alt: item.alt, caption: item.caption };
      setSaved("error");
      setError(result.error);
    }
  };

  // Debounced so dragging with the keyboard doesn't write on every press.
  const moveFocal = (x: number, y: number) => {
    const next = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    setFocal(next);
    setSaved("saving");
    window.clearTimeout(focalTimer.current);
    focalTimer.current = window.setTimeout(async () => {
      const result = await setMediaFocalPoint({ id: item.id, ...next });
      if (!result.ok) {
        setSaved("error");
        notify(result.error);
      } else {
        setSaved("saved");
        router.refresh();
      }
    }, 400);
  };

  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <aside className="admin-panel admin-media-detail" aria-label="File details">
      {item.kind === "image" && item.thumb ? (
        <>
          <div
            className="admin-focal"
            role="group"
            tabIndex={0}
            aria-label={`Focal point ${pct(focal.x)} across, ${pct(focal.y)} down. Click the image or use the arrow keys to move it.`}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              moveFocal((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
            }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 0.1 : 0.02;
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const move = moves[event.key];
              if (!move) return;
              event.preventDefault();
              moveFocal(focal.x + move[0], focal.y + move[1]);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumb} srcSet={item.srcSet ?? undefined} sizes="360px" alt={item.alt} />
            <span aria-hidden="true" className="admin-focal-x" style={{ top: pct(focal.y) }} />
            <span aria-hidden="true" className="admin-focal-y" style={{ left: pct(focal.x) }} />
            <span aria-hidden="true" className="admin-focal-ring" style={{ left: pct(focal.x), top: pct(focal.y) }} />
          </div>
          <span className="font-mono text-[10px] tracking-[0.06em] text-label">
            FOCAL POINT {pct(focal.x)} · {pct(focal.y)} · CLICK OR USE ARROW KEYS
          </span>
        </>
      ) : (
        <div className="admin-media-thumb aspect-[4/3] border border-a-border">
          <span className="admin-media-ext">{item.ext}</span>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="admin-eyebrow">Alt text{item.kind === "image" ? " · required" : ""}</span>
        <input
          id={altId}
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          onBlur={saveDetails}
          onKeyDown={(event) => event.key === "Enter" && saveDetails()}
          placeholder="Describe the image"
          maxLength={300}
          className="admin-field"
          data-missing={item.kind === "image" && !alt.trim() ? "" : undefined}
          aria-describedby={item.kind === "image" && !alt.trim() ? `${altId}-hint` : undefined}
        />
        {item.kind === "image" && !alt.trim() ? (
          <span id={`${altId}-hint`} className="text-[12px] text-[#8A5A00]">
            Needed before this image can be published on the site.
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="admin-eyebrow">Caption</span>
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          onBlur={saveDetails}
          onKeyDown={(event) => event.key === "Enter" && saveDetails()}
          maxLength={500}
          className="admin-field"
        />
      </label>
      <p className="m-0 min-h-[1em] font-mono text-[10px] text-label" role="status">
        {saved === "saving" ? "SAVING…" : saved === "saved" ? "SAVED" : ""}
      </p>
      {error ? (
        <p role="alert" className="m-0 text-[12px] text-[var(--destructive)]">
          {error}
        </p>
      ) : null}

      <dl className="admin-meta">
        <dt>File</dt>
        <dd>{item.filename}</dd>
        <dt>Type</dt>
        <dd>{item.mimeType}</dd>
        <dt>Dimensions</dt>
        <dd>{item.width && item.height ? `${item.width} × ${item.height}` : "—"}</dd>
        <dt>Size</dt>
        <dd>{item.size}</dd>
        <dt>Uploaded</dt>
        <dd>{item.created}</dd>
        <dt>Variants</dt>
        <dd className="font-mono text-[11px]">{item.variantSummary}</dd>
      </dl>

      <div className="flex flex-wrap gap-1.5 border-t border-a-row pt-2.5">
        <button
          type="button"
          className="admin-btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(new URL(item.url, window.location.origin).toString());
              notify("URL copied");
            } catch {
              notify("Couldn't copy. Select the URL from the file instead.");
            }
          }}
        >
          Copy URL
        </button>
        <a href={item.url} target="_blank" rel="noopener" className="admin-btn-sm">
          Open ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" className="admin-btn-sm" onClick={onReplace} disabled={!storageReady}>
          Replace
        </button>
        {canDelete ? (
          <button type="button" className="admin-btn-sm admin-btn-danger" onClick={onDelete}>
            Delete…
          </button>
        ) : null}
      </div>
    </aside>
  );
}
