import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Media } from "@prisma/client";
import { deleteObjects, mediaUrl, putObject } from "@/lib/storage";

// ---------- Accepted files ----------
// SVG is deliberately not accepted yet: it can carry script, and needs a
// proper sanitiser (DOMPurify + jsdom) before it is safe to serve.

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
const FORMATS = ["avif", "webp"] as const;

export class UploadError extends Error {}

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

const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .slice(0, 120) || "file";

/**
 * Stores a verified upload: images are re-encoded (dropping EXIF/GPS and any
 * trailing payload) and resized into responsive variants; other files are
 * stored as sniffed. Returns the fields for the Media row.
 */
export async function storeUpload(bytes: Buffer, filename: string) {
  const type = sniff(bytes);
  if (!type) throw new UploadError("That file type isn't supported. Use JPEG, PNG, WebP, AVIF, GIF, MP4, WebM or PDF.");
  checkSize(type, bytes.length);
  const spec = TYPES[type];
  const base = `media/${randomUUID()}`;
  const written: string[] = [];

  try {
    if (spec.kind === "image") {
      // .rotate() applies EXIF orientation before the metadata is discarded.
      const source = sharp(bytes, { failOn: "error", limitInputPixels: 100_000_000 }).rotate();
      // Re-encode at high quality: this copy is the master every crop is made from.
      const master =
        type === "image/jpeg"
          ? source.jpeg({ quality: 92, mozjpeg: true })
          : type === "image/webp"
            ? source.webp({ quality: 92 })
            : type === "image/avif"
              ? source.avif({ quality: 75 })
              : source.png();
      const { data: clean, info } = await master.toBuffer({ resolveWithObject: true });
      const key = `${base}/original.${spec.ext}`;
      await putObject(key, clean, type);
      written.push(key);

      const widths: number[] = VARIANT_WIDTHS.filter((w) => w <= info.width);
      if (widths.length === 0) widths.push(info.width);
      for (const width of widths) {
        const resized = sharp(clean).resize({ width, withoutEnlargement: true });
        const [avif, webp] = await Promise.all([
          resized.clone().avif({ quality: 55, effort: 3 }).toBuffer(),
          resized.clone().webp({ quality: 78 }).toBuffer(),
        ]);
        await Promise.all([
          putObject(`${base}/${width}.avif`, avif, "image/avif"),
          putObject(`${base}/${width}.webp`, webp, "image/webp"),
        ]);
        written.push(`${base}/${width}.avif`, `${base}/${width}.webp`);
      }

      return {
        key,
        filename: safeName(filename),
        mimeType: type,
        sizeBytes: clean.length,
        width: info.width,
        height: info.height,
        variants: { base, widths, formats: [...FORMATS] } satisfies Variants,
      };
    }

    let width: number | null = null;
    let height: number | null = null;
    if (spec.kind === "animated") {
      const meta = await sharp(bytes, { animated: true, failOn: "error" }).metadata();
      width = meta.width ?? null;
      height = meta.pageHeight ?? meta.height ?? null;
    }
    const key = `${base}/file.${spec.ext}`;
    await putObject(key, bytes, type);
    written.push(key);
    return { key, filename: safeName(filename), mimeType: type, sizeBytes: bytes.length, width, height, variants: null };
  } catch (error) {
    // Never leave half-processed objects behind.
    await deleteObjects(written).catch(() => {});
    if (error instanceof UploadError) throw error;
    throw new UploadError("That file couldn't be processed. It may be damaged or not a real image.");
  }
}

export function objectKeys(media: Pick<Media, "key" | "variants">) {
  const keys = [media.key];
  const v = media.variants as Variants | null;
  if (v) for (const w of v.widths) for (const f of v.formats) keys.push(`${v.base}/${w}.${f}`);
  return keys;
}

// ---------- View model shared by admin screens ----------

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
