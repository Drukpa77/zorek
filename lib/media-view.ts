import type { Media } from "@prisma/client";
import { mediaUrl } from "@/lib/storage";

// View helpers for media records. This module must not import `sharp`:
// admin and public pages render these records, and loading sharp pulls in a
// platform-specific native binary that is not needed to display them.

type Kind = "image" | "animated" | "video" | "pdf";

const TYPES: Record<string, { ext: string; kind: Kind; maxBytes: number }> = {
  "image/jpeg": { ext: "jpg", kind: "image", maxBytes: 25 * 1024 ** 2 },
  "image/png": { ext: "png", kind: "image", maxBytes: 25 * 1024 ** 2 },
  "image/webp": { ext: "webp", kind: "image", maxBytes: 25 * 1024 ** 2 },
  "image/avif": { ext: "avif", kind: "image", maxBytes: 25 * 1024 ** 2 },
  "image/gif": { ext: "gif", kind: "animated", maxBytes: 15 * 1024 ** 2 },
  "video/mp4": { ext: "mp4", kind: "video", maxBytes: 200 * 1024 ** 2 },
  "video/webm": { ext: "webm", kind: "video", maxBytes: 200 * 1024 ** 2 },
  "application/pdf": { ext: "pdf", kind: "pdf", maxBytes: 20 * 1024 ** 2 },
};

export const ACCEPT = Object.keys(TYPES).join(",");
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(TYPES).map((t) => t.maxBytes));
export const VARIANT_WIDTHS = [640, 1280, 1920, 2880] as const;

export class UploadError extends Error {}

export function typeSpec(type: string) {
  return TYPES[type];
}

const ascii = (bytes: Buffer, start: number, end: number) => bytes.subarray(start, end).toString("latin1");

/** Identifies the file from its bytes. The browser's declared type is never trusted. */
export function sniff(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.readUInt32BE(0) === 0x1a45dfa3) return "video/webm";
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (/^(isom|iso2|mp41|mp42|avc1|dash|M4V )$/.test(brand)) return "video/mp4";
  }
  return null;
}

export function checkSize(type: string, bytes: number) {
  const spec = TYPES[type];
  if (!spec) throw new UploadError("That file type isn't supported. Use JPEG, PNG, WebP, AVIF, GIF, MP4, WebM or PDF.");
  if (bytes > spec.maxBytes) {
    throw new UploadError(`That file is too large. The limit for ${spec.ext.toUpperCase()} is ${spec.maxBytes / 1024 ** 2} MB.`);
  }
}

export type Variants = { base: string; widths: number[]; formats: string[] };

export function objectKeys(media: Pick<Media, "key" | "variants">) {
  const keys = [media.key];
  const v = media.variants as Variants | null;
  if (v) for (const w of v.widths) for (const f of v.formats) keys.push(`${v.base}/${w}.${f}`);
  return keys;
}

export type MediaView = {
  id: string;
  filename: string;
  url: string;
  thumb: string | null;
  srcSet: string | null;
  srcSetAvif: string | null;
  /** Largest generated width, for picking a sensible default src. */
  largest: string | null;
  kind: "image" | "video" | "pdf";
  ext: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: string;
  alt: string;
  caption: string;
  focalX: number;
  focalY: number;
  created: string;
  variantSummary: string;
};

const sizeLabel = (bytes: number) =>
  bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const created = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });

export function toMediaView(media: Media): MediaView {
  const v = media.variants as Variants | null;
  const spec = TYPES[media.mimeType];
  const kind = media.mimeType.startsWith("video/") ? "video" : media.mimeType === "application/pdf" ? "pdf" : "image";
  return {
    id: media.id,
    filename: media.filename,
    url: mediaUrl(media.key),
    thumb: v ? mediaUrl(`${v.base}/${v.widths[0]}.webp`) : kind === "image" ? mediaUrl(media.key) : null,
    srcSet: v ? v.widths.map((w) => `${mediaUrl(`${v.base}/${w}.webp`)} ${w}w`).join(", ") : null,
    srcSetAvif: v ? v.widths.map((w) => `${mediaUrl(`${v.base}/${w}.avif`)} ${w}w`).join(", ") : null,
    largest: v ? mediaUrl(`${v.base}/${v.widths[v.widths.length - 1]}.webp`) : null,
    kind,
    ext: (spec?.ext ?? media.mimeType.split("/")[1] ?? "file").toUpperCase(),
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    size: sizeLabel(media.sizeBytes),
    alt: media.alt,
    caption: media.caption ?? "",
    focalX: media.focalX,
    focalY: media.focalY,
    created: created.format(media.createdAt),
    variantSummary: v ? `${v.widths.join(" · ")} · ${v.formats.map((f) => f.toUpperCase()).join("/")}` : "Original only",
  };
}
