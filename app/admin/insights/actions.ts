"use server";

import type { Prisma, Status } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccess } from "@/lib/admin-nav";
import { mediaById, slugify } from "@/lib/case-studies";
import { saveVersion, versionData, type VersionView, versionsFor } from "@/lib/content-versions";
import { type InsightData, type InsightInput, insightInput } from "@/lib/insight-schema";
import { insightEditorInclude, toInsightEditorData } from "@/lib/insights";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { docMediaIds, emptyDoc } from "@/lib/rich-text";

type Fail = { ok: false; error: string };
type Simple = { ok: true } | Fail;
export type InsightIntent = "autosave" | "draft" | "publish" | "update" | "unpublish";
export type InsightSaveResult = { ok: true; status: Status; updatedAt: string; slug: string; publishAt: string | null } | Fail;

const id = z.string().trim().min(1).max(40);
const LIVE: Status[] = ["PUBLISHED", "SCHEDULED"];

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "article";
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const taken = await prisma.insight.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function revalidate(...slugs: (string | undefined)[]) {
  revalidatePath("/insights");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/insights/${slug}`);
  revalidatePath("/admin/insights");
  revalidatePath("/admin");
}

const log = (tx: Prisma.TransactionClient, userId: string, entityId: string, action: string, summary: string) =>
  tx.activityLog.create({ data: { userId, action, entityType: "Insight", entityId, summary } });

async function snapshot(tx: Prisma.TransactionClient, userId: string, insightId: string, label: string) {
  const row = await tx.insight.findUniqueOrThrow({ where: { id: insightId }, include: insightEditorInclude });
  await saveVersion(tx, { entityType: "Insight", entityId: insightId, userId, label, status: row.status, data: toInsightEditorData(row) });
}

async function writeContent(tx: Prisma.TransactionClient, insightId: string, seoId: string | null, data: InsightData) {
  const seoData = { title: data.seo.title || null, description: data.seo.description || null, noindex: data.seo.noindex };
  const seo = seoId ? await tx.seo.update({ where: { id: seoId }, data: seoData }) : await tx.seo.create({ data: seoData });
  const tags = [...new Map(data.tags.map((name) => [slugify(name), name])).entries()].filter(([slug]) => slug);
  await tx.insight.update({
    where: { id: insightId },
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      categoryId: data.categoryId,
      body: data.body as Prisma.InputJsonValue,
      featuredImageId: data.featuredImageId,
      featured: data.featured,
      publishAt: data.publishAt ? new Date(data.publishAt) : null,
      seoId: seo.id,
      tags: {
        set: [],
        connectOrCreate: tags.map(([slug, name]) => ({ where: { slug }, create: { slug, name } })),
      },
    },
  });
}

// ---------- Create ----------

export async function createInsight() {
  const user = await requireRole("AUTHOR");
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.insight.create({
      data: {
        title: "Untitled article",
        slug: await uniqueSlug("untitled-article"),
        authorId: user.id,
        body: emptyDoc() as Prisma.InputJsonValue,
        status: "DRAFT",
      },
    });
    await log(tx, user.id, row.id, "insight.create", "Created an article draft");
    return row;
  });
  revalidate();
  redirect(`/admin/insights/${created.id}`);
}

// ---------- Save from the editor ----------

export async function saveInsight(insightId: string, input: InsightInput, intent: InsightIntent, baseUpdatedAt: string): Promise<InsightSaveResult> {
  const user = await requireRole("AUTHOR");
  if (!id.safeParse(insightId).success) return { ok: false, error: "That article couldn't be found." };
  if (intent !== "autosave" && intent !== "draft" && !canAccess(user.role, "EDITOR")) {
    return { ok: false, error: "Publishing needs an Editor or Admin. Save a draft and ask them to publish it." };
  }

  const parsed = insightInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Some fields need attention." };
  const data = parsed.data;

  const current = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null } });
  if (!current) return { ok: false, error: "That article no longer exists." };
  if (current.updatedAt.toISOString() !== baseUpdatedAt) {
    return { ok: false, error: "This article was changed in another tab or by someone else. Reload to see the latest version." };
  }
  if (intent === "autosave" && LIVE.includes(current.status)) {
    return { ok: false, error: "Live and scheduled articles aren't autosaved. Use Update to apply your changes." };
  }
  if (await prisma.insight.findFirst({ where: { slug: data.slug, NOT: { id: insightId } }, select: { id: true } })) {
    return { ok: false, error: `The slug “${data.slug}” is already used by another article.` };
  }
  if (data.categoryId && !(await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }))) {
    return { ok: false, error: "That category no longer exists. Choose another." };
  }

  const now = new Date();
  const when = data.publishAt ? new Date(data.publishAt) : null;
  const future = Boolean(when && when > now);
  let status: Status = current.status;
  let publishedAt = current.publishedAt;
  if (intent === "publish" || intent === "update") {
    status = future ? "SCHEDULED" : "PUBLISHED";
    // A scheduled article is "published" when its time arrives; keep the first real date otherwise.
    publishedAt = future ? null : (current.publishedAt ?? when ?? now);
  } else if (intent === "unpublish") {
    status = "DRAFT";
  }

  const wasLive = current.status === "PUBLISHED" || (current.status === "SCHEDULED" && !!current.publishAt && current.publishAt <= now);
  const slugChanged = current.slug !== data.slug;

  const saved = await prisma.$transaction(async (tx) => {
    await writeContent(tx, insightId, current.seoId, data);
    const row = await tx.insight.update({ where: { id: insightId }, data: { status, publishedAt } });
    if (wasLive && slugChanged) {
      const from = `/insights/${current.slug}`;
      const to = `/insights/${data.slug}`;
      await tx.redirect.deleteMany({ where: { fromPath: to } });
      await tx.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
      await tx.redirect.upsert({ where: { fromPath: from }, create: { fromPath: from, toPath: to }, update: { toPath: to } });
    }
    if (intent !== "autosave") {
      const label =
        intent === "draft" ? "Draft saved"
        : intent === "unpublish" ? "Unpublished"
        : status === "SCHEDULED" ? "Scheduled"
        : intent === "publish" ? "Published"
        : "Updated";
      await snapshot(tx, user.id, insightId, label);
      await log(tx, user.id, insightId, `insight.${intent}`, `${label} “${data.title}”`);
    }
    return row;
  });

  revalidate(current.slug, data.slug);
  return { ok: true, status: saved.status, updatedAt: saved.updatedAt.toISOString(), slug: saved.slug, publishAt: saved.publishAt?.toISOString() ?? null };
}

// ---------- Versions ----------

export async function listInsightVersions(insightId: string): Promise<VersionView[]> {
  await requireRole("AUTHOR");
  return versionsFor("Insight", insightId);
}

export async function loadInsightEditorState(insightId: string) {
  await requireRole("AUTHOR");
  const row = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null }, include: insightEditorInclude });
  if (!row) return null;
  const data = toInsightEditorData(row);
  const media = await mediaById([data.featuredImageId, ...docMediaIds(data.body)]);
  return { data, status: row.status, updatedAt: row.updatedAt.toISOString(), media: Object.fromEntries(media) };
}

export async function restoreInsightVersion(insightId: string, versionId: string): Promise<InsightSaveResult> {
  const user = await requireRole("EDITOR");
  const stored = await versionData("Insight", insightId, versionId);
  const current = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null } });
  if (stored === undefined || !current) return { ok: false, error: "That version couldn't be found." };
  const parsed = insightInput.safeParse(stored);
  if (!parsed.success) return { ok: false, error: "That version can't be restored because its content is no longer valid." };
  // Slug and schedule stay as they are now: restoring content must not move or re-time a live page.
  const data = { ...parsed.data, slug: current.slug, publishAt: current.publishAt?.toISOString() ?? null };

  const saved = await prisma.$transaction(async (tx) => {
    await snapshot(tx, user.id, insightId, "Before restore");
    await writeContent(tx, insightId, current.seoId, data);
    const row = await tx.insight.update({ where: { id: insightId }, data: { updatedAt: new Date() } });
    await log(tx, user.id, insightId, "insight.restore", `Restored a version of “${data.title}”`);
    return row;
  });
  revalidate(current.slug);
  return { ok: true, status: saved.status, updatedAt: saved.updatedAt.toISOString(), slug: saved.slug, publishAt: saved.publishAt?.toISOString() ?? null };
}

// ---------- List actions ----------

export async function duplicateInsight(insightId: string): Promise<Simple> {
  const user = await requireRole("AUTHOR");
  const source = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null }, include: insightEditorInclude });
  if (!source) return { ok: false, error: "That article no longer exists." };
  const data = toInsightEditorData(source);
  await prisma.$transaction(async (tx) => {
    const copy = await tx.insight.create({
      data: {
        title: `${source.title} (copy)`.slice(0, 160),
        slug: await uniqueSlug(`${source.slug}-copy`),
        authorId: user.id,
        body: data.body as Prisma.InputJsonValue,
        status: "DRAFT",
      },
    });
    await writeContent(tx, copy.id, null, { ...data, title: copy.title, slug: copy.slug, featured: false, publishAt: null });
    await log(tx, user.id, copy.id, "insight.duplicate", `Duplicated “${source.title}” as a draft`);
  });
  revalidate();
  return { ok: true };
}

export async function setInsightPublished(insightId: string, publish: boolean): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const row = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null } });
  if (!row) return { ok: false, error: "That article no longer exists." };
  const now = new Date();
  const future = Boolean(row.publishAt && row.publishAt > now);
  await prisma.$transaction(async (tx) => {
    await tx.insight.update({
      where: { id: row.id },
      data: publish
        ? { status: future ? "SCHEDULED" : "PUBLISHED", publishedAt: future ? null : (row.publishedAt ?? row.publishAt ?? now) }
        : { status: "DRAFT" },
    });
    const label = !publish ? "Unpublished" : future ? "Scheduled" : "Published";
    await snapshot(tx, user.id, row.id, label);
    await log(tx, user.id, row.id, `insight.${publish ? "publish" : "unpublish"}`, `${label} “${row.title}”`);
  });
  revalidate(row.slug);
  return { ok: true };
}

export async function toggleInsightFeatured(insightId: string): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const row = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null } });
  if (!row) return { ok: false, error: "That article no longer exists." };
  await prisma.$transaction(async (tx) => {
    await tx.insight.update({ where: { id: row.id }, data: { featured: !row.featured } });
    await log(tx, user.id, row.id, "insight.edit", `${row.featured ? "Unfeatured" : "Featured"} “${row.title}”`);
  });
  revalidate(row.slug);
  return { ok: true };
}

export async function trashInsight(insightId: string): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const row = await prisma.insight.findFirst({ where: { id: insightId, deletedAt: null } });
  if (!row) return { ok: false, error: "That article no longer exists." };
  await prisma.$transaction(async (tx) => {
    await tx.insight.update({ where: { id: row.id }, data: { deletedAt: new Date(), featured: false } });
    await log(tx, user.id, row.id, "insight.trash", `Moved “${row.title}” to trash`);
  });
  revalidate(row.slug);
  return { ok: true };
}
