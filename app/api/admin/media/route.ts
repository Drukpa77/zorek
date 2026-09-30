import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccess } from "@/lib/admin-nav";
import { MAX_UPLOAD_BYTES, UploadError, objectKeys, storeUpload, toMediaView } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { deleteObjects, storageConfigured } from "@/lib/storage";

// Uploads stream through the app so every file is size-capped and sniffed
// before anything is written to the bucket. Body: the raw file.
// Headers: X-Filename (URI-encoded). Query: ?replace=<mediaId>.

export const runtime = "nodejs";
export const maxDuration = 120;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function readCapped(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError("The upload was empty.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new UploadError(`That file is larger than the ${limit / 1024 ** 2} MB limit.`);
    }
    chunks.push(value);
  }
  if (total === 0) throw new UploadError("The upload was empty.");
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  // Route handlers don't get server actions' built-in CSRF check.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return fail(403, "Cross-site upload refused.");

  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role || !canAccess(user.role, "AUTHOR")) return fail(401, "Sign in to upload files.");
  if (!storageConfigured()) return fail(503, "File storage isn't configured on this server.");
  if (!rateLimit(`media:${user.id}`, 60, 10 * 60_000)) return fail(429, "Too many uploads. Wait a few minutes and try again.");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) return fail(413, `That file is larger than the ${MAX_UPLOAD_BYTES / 1024 ** 2} MB limit.`);

  const replaceId = new URL(request.url).searchParams.get("replace");
  const existing = replaceId
    ? await prisma.media.findFirst({ where: { id: replaceId, deletedAt: null } })
    : null;
  if (replaceId && !existing) return fail(404, "The file you're replacing no longer exists.");

  let filename = "file";
  try {
    filename = decodeURIComponent(request.headers.get("x-filename") ?? "file");
  } catch {
    /* keep the fallback name */
  }

  try {
    const bytes = await readCapped(request, MAX_UPLOAD_BYTES);
    const stored = await storeUpload(bytes, filename);

    const media = existing
      ? await prisma.media.update({
          where: { id: existing.id },
          // A new image invalidates the old focal point; alt text is kept for review.
          data: { ...stored, variants: stored.variants ?? Prisma.DbNull, focalX: 0.5, focalY: 0.5 },
        })
      : await prisma.media.create({
          data: { ...stored, variants: stored.variants ?? Prisma.DbNull, uploadedById: user.id },
        });

    if (existing) await deleteObjects(objectKeys(existing)).catch(() => {});
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: existing ? "media.replace" : "media.upload",
        entityType: "Media",
        entityId: media.id,
        summary: `${existing ? "Replaced" : "Uploaded"} ${media.filename}`,
      },
    });
    revalidatePath("/admin/media");
    revalidatePath("/admin");
    return NextResponse.json({ media: toMediaView(media) }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof UploadError) return fail(422, error.message);
    console.error("[media] Upload failed", error);
    return fail(500, "The upload failed. Please try again.");
  }
}
