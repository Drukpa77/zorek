import { randomUUID } from "node:crypto";
import { deleteObjects, putObject } from "@/lib/storage";
import { UploadError, VARIANT_WIDTHS, checkSize, sniff, typeSpec, type Variants } from "@/lib/media-view";

export {
  ACCEPT,
  MAX_UPLOAD_BYTES,
  UploadError,
  VARIANT_WIDTHS,
  checkSize,
  objectKeys,
  sniff,
  toMediaView,
} from "@/lib/media-view";
export type { MediaView, Variants } from "@/lib/media-view";

const FORMATS = ["avif", "webp"] as const;

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
  const spec = typeSpec(type);
  if (!spec) throw new UploadError("That file type isn't supported. Use JPEG, PNG, WebP, AVIF, GIF, MP4, WebM or PDF.");
  const base = `media/${randomUUID()}`;
  const written: string[] = [];

  try {
    if (spec.kind === "image") {
      const { default: sharp } = await import("sharp");
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
      const { default: sharp } = await import("sharp");
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
