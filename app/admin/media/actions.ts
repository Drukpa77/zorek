"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type MediaView, toMediaView } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

type Result = { ok: true } | { ok: false; error: string };

const id = z.string().trim().min(1).max(40);

const detailsSchema = z.object({
  id,
  alt: z.string().trim().max(300, "Keep alt text under 300 characters."),
  caption: z.string().trim().max(500, "Keep the caption under 500 characters."),
});

const focalSchema = z.object({
  id,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

async function log(userId: string, mediaId: string, action: string, summary: string) {
  await prisma.activityLog.create({ data: { userId, action, entityType: "Media", entityId: mediaId, summary } });
  revalidatePath("/admin/media");
  revalidatePath("/admin");
}

export async function updateMediaDetails(input: z.input<typeof detailsSchema>): Promise<Result> {
  const user = await requireRole("AUTHOR");
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details and try again." };

  const { id: mediaId, alt, caption } = parsed.data;
  const media = await prisma.media.updateMany({
    where: { id: mediaId, deletedAt: null },
    data: { alt, caption: caption || null },
  });
  if (media.count === 0) return { ok: false, error: "That file no longer exists." };
  await log(user.id, mediaId, "media.edit", "Edited alt text and caption");
  return { ok: true };
}

export async function setMediaFocalPoint(input: z.input<typeof focalSchema>): Promise<Result> {
  const user = await requireRole("AUTHOR");
  const parsed = focalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That focal point is out of range." };

  const { id: mediaId, x, y } = parsed.data;
  const media = await prisma.media.updateMany({
    where: { id: mediaId, deletedAt: null },
    data: { focalX: Math.round(x * 1000) / 1000, focalY: Math.round(y * 1000) / 1000 },
  });
  if (media.count === 0) return { ok: false, error: "That file no longer exists." };
  await log(user.id, mediaId, "media.edit", "Set the focal point");
  return { ok: true };
}

/** Media search for pickers inside editors. */
export async function searchMedia(query: string, kind: "image" | "video"): Promise<MediaView[]> {
  await requireRole("AUTHOR");
  const q = query.trim().slice(0, 80);
  const contains = { contains: q, mode: "insensitive" as const };
  const rows = await prisma.media.findMany({
    where: {
      deletedAt: null,
      mimeType: kind === "video" ? { startsWith: "video/" } : { startsWith: "image/" },
      ...(q ? { OR: [{ filename: contains }, { alt: contains }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return rows.map(toMediaView);
}

// Soft delete: the file stays in storage for 30 days so live pages don't
// break and mistakes can be undone. A scheduled purge removes it afterwards.
export async function trashMedia(mediaId: string): Promise<Result> {
  const user = await requireRole("EDITOR");
  const parsed = id.safeParse(mediaId);
  if (!parsed.success) return { ok: false, error: "That file couldn't be found." };

  const media = await prisma.media.findFirst({ where: { id: parsed.data, deletedAt: null } });
  if (!media) return { ok: false, error: "That file no longer exists." };
  await prisma.media.update({ where: { id: media.id }, data: { deletedAt: new Date() } });
  await log(user.id, media.id, "media.trash", `Moved ${media.filename} to trash`);
  return { ok: true };
}
