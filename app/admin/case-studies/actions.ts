"use server";

import type { Prisma, Status } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccess } from "@/lib/admin-nav";
import { mediaIdsIn } from "@/lib/blocks";
import { type CaseStudyData, type CaseStudyInput, caseStudyInput, editorInclude, mediaById, slugify, toEditorData } from "@/lib/case-studies";
import { saveVersion, versionData, type VersionView, versionsFor } from "@/lib/content-versions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

type Fail = { ok: false; error: string };
export type SaveIntent = "autosave" | "draft" | "publish" | "update" | "unpublish";
export type SaveResult = { ok: true; status: Status; updatedAt: string; slug: string } | Fail;

const id = z.string().trim().min(1).max(40);
const LIVE: Status[] = ["PUBLISHED", "SCHEDULED"];

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "case-study";
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const taken = await prisma.caseStudy.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function revalidate(...slugs: (string | undefined)[]) {
  revalidatePath("/work");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/work/${slug}`);
  revalidatePath("/admin/case-studies");
  revalidatePath("/admin");
}

async function log(tx: Prisma.TransactionClient, userId: string, entityId: string, action: string, summary: string) {
  await tx.activityLog.create({ data: { userId, action, entityType: "CaseStudy", entityId, summary } });
}

async function snapshot(tx: Prisma.TransactionClient, userId: string, caseStudyId: string, label: string) {
  const row = await tx.caseStudy.findUniqueOrThrow({ where: { id: caseStudyId }, include: editorInclude });
  await saveVersion(tx, { entityType: "CaseStudy", entityId: caseStudyId, userId, label, status: row.status, data: toEditorData(row) });
}

async function writeContent(tx: Prisma.TransactionClient, caseStudyId: string, seoId: string | null, data: CaseStudyData) {
  const seoData = { title: data.seo.title || null, description: data.seo.description || null, noindex: data.seo.noindex };
  const seo = seoId
    ? await tx.seo.update({ where: { id: seoId }, data: seoData })
    : await tx.seo.create({ data: seoData });

  await tx.caseStudy.update({
    where: { id: caseStudyId },
    data: {
      name: data.name,
      clientName: data.clientName,
      slug: data.slug,
      shortDescription: data.shortDescription,
      year: data.year,
      industryId: data.industryId,
      projectType: data.projectType,
      services: data.services,
      technologies: data.technologies,
      featured: data.featured,
      heroImageId: data.heroImageId,
      seoId: seo.id,
    },
  });
  await tx.caseStudyBlock.deleteMany({ where: { caseStudyId } });
  if (data.blocks.length) {
    await tx.caseStudyBlock.createMany({
      data: data.blocks.map((block, order) => ({
        caseStudyId,
        type: block.type,
        order,
        hidden: block.hidden,
        data: block.data as Prisma.InputJsonValue,
      })),
    });
  }
}

// ---------- Create ----------

export async function createCaseStudy() {
  const user = await requireRole("AUTHOR");
  const last = await prisma.caseStudy.aggregate({ _max: { displayOrder: true } });
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.caseStudy.create({
      data: {
        name: "Untitled case study",
        clientName: "",
        shortDescription: "",
        slug: await uniqueSlug("untitled-case-study"),
        status: "DRAFT",
        displayOrder: (last._max.displayOrder ?? -1) + 1,
        services: [],
        technologies: [],
      },
    });
    await log(tx, user.id, row.id, "caseStudy.create", "Created a case study draft");
    return row;
  });
  revalidate();
  redirect(`/admin/case-studies/${created.id}`);
}

// ---------- Save from the editor ----------

export async function saveCaseStudy(
  caseStudyId: string,
  input: CaseStudyInput,
  intent: SaveIntent,
  baseUpdatedAt: string,
): Promise<SaveResult> {
  const user = await requireRole("AUTHOR");
  if (!id.safeParse(caseStudyId).success) return { ok: false, error: "That case study couldn't be found." };
  if ((intent === "publish" || intent === "update" || intent === "unpublish") && !canAccess(user.role, "EDITOR")) {
    return { ok: false, error: "Publishing needs an Editor or Admin. Save a draft and ask them to publish it." };
  }

  const parsed = caseStudyInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Some fields need attention." };
  }
  const data = parsed.data;

  const current = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null } });
  if (!current) return { ok: false, error: "That case study no longer exists." };
  if (current.updatedAt.toISOString() !== baseUpdatedAt) {
    return { ok: false, error: "This case study was changed in another tab or by someone else. Reload to see the latest version." };
  }
  // Autosave never touches a live page; changes wait for an explicit Update.
  if (intent === "autosave" && LIVE.includes(current.status)) {
    return { ok: false, error: "Live case studies aren't autosaved. Use Update to publish your changes." };
  }

  const slugTaken = await prisma.caseStudy.findFirst({ where: { slug: data.slug, NOT: { id: caseStudyId } }, select: { id: true } });
  if (slugTaken) return { ok: false, error: `The slug “${data.slug}” is already used by another case study.` };
  if (data.industryId && !(await prisma.industry.findUnique({ where: { id: data.industryId }, select: { id: true } }))) {
    return { ok: false, error: "That industry no longer exists. Choose another." };
  }

  const status: Status =
    intent === "publish" || intent === "update" ? "PUBLISHED" : intent === "unpublish" ? "DRAFT" : current.status;
  const wasLive = current.status === "PUBLISHED";
  const slugChanged = current.slug !== data.slug;

  const saved = await prisma.$transaction(async (tx) => {
    await writeContent(tx, caseStudyId, current.seoId, data);
    const row = await tx.caseStudy.update({
      where: { id: caseStudyId },
      data: {
        status,
        publishedAt: status === "PUBLISHED" ? (current.publishedAt ?? new Date()) : current.publishedAt,
      },
    });

    // Keep old links working when a live page moves.
    if (wasLive && slugChanged) {
      const from = `/work/${current.slug}`;
      const to = `/work/${data.slug}`;
      await tx.redirect.deleteMany({ where: { fromPath: to } });
      await tx.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
      await tx.redirect.upsert({ where: { fromPath: from }, create: { fromPath: from, toPath: to }, update: { toPath: to } });
    }

    if (intent !== "autosave") {
      const label = { draft: "Draft saved", publish: "Published", update: "Updated", unpublish: "Unpublished" }[intent];
      await snapshot(tx, user.id, caseStudyId, label);
      await log(tx, user.id, caseStudyId, `caseStudy.${intent}`, `${label} “${data.name}”`);
    }
    return row;
  });

  revalidate(current.slug, data.slug);
  return { ok: true, status: saved.status, updatedAt: saved.updatedAt.toISOString(), slug: saved.slug };
}

// ---------- Versions ----------

export async function listVersions(caseStudyId: string): Promise<VersionView[]> {
  await requireRole("AUTHOR");
  return versionsFor("CaseStudy", caseStudyId);
}

/** Fresh editor state, e.g. after restoring a version. */
export async function loadEditorState(caseStudyId: string) {
  await requireRole("AUTHOR");
  const row = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null }, include: editorInclude });
  if (!row) return null;
  const data = toEditorData(row);
  const media = await mediaById([data.heroImageId, ...data.blocks.flatMap((b) => mediaIdsIn(b.data))]);
  return { data, status: row.status, updatedAt: row.updatedAt.toISOString(), media: Object.fromEntries(media) };
}

export async function restoreVersion(caseStudyId: string, versionId: string): Promise<SaveResult> {
  const user = await requireRole("EDITOR");
  const stored = await versionData("CaseStudy", caseStudyId, versionId);
  const current = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null } });
  if (stored === undefined || !current) return { ok: false, error: "That version couldn't be found." };

  const parsed = caseStudyInput.safeParse(stored);
  if (!parsed.success) return { ok: false, error: "That version can't be restored because its content is no longer valid." };
  // The slug stays as it is now: restoring must not silently move a live page.
  const data = { ...parsed.data, slug: current.slug };

  const saved = await prisma.$transaction(async (tx) => {
    await snapshot(tx, user.id, caseStudyId, "Before restore");
    await writeContent(tx, caseStudyId, current.seoId, data);
    const row = await tx.caseStudy.update({ where: { id: caseStudyId }, data: { updatedAt: new Date() } });
    await log(tx, user.id, caseStudyId, "caseStudy.restore", `Restored a version of “${data.name}”`);
    return row;
  });
  revalidate(current.slug);
  return { ok: true, status: saved.status, updatedAt: saved.updatedAt.toISOString(), slug: saved.slug };
}

// ---------- List actions ----------

type Simple = { ok: true } | Fail;

export async function duplicateCaseStudy(caseStudyId: string): Promise<Simple> {
  const user = await requireRole("AUTHOR");
  const source = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null }, include: editorInclude });
  if (!source) return { ok: false, error: "That case study no longer exists." };
  const last = await prisma.caseStudy.aggregate({ _max: { displayOrder: true } });
  const data = toEditorData(source);

  await prisma.$transaction(async (tx) => {
    const copy = await tx.caseStudy.create({
      data: {
        name: `${source.name} (copy)`.slice(0, 120),
        clientName: source.clientName,
        shortDescription: source.shortDescription,
        slug: await uniqueSlug(`${source.slug}-copy`),
        status: "DRAFT",
        displayOrder: (last._max.displayOrder ?? -1) + 1,
        services: source.services,
        technologies: source.technologies,
      },
    });
    await writeContent(tx, copy.id, null, { ...data, name: copy.name, slug: copy.slug, featured: false });
    await log(tx, user.id, copy.id, "caseStudy.duplicate", `Duplicated “${source.name}” as a draft`);
  });
  revalidate();
  return { ok: true };
}

export async function setPublished(caseStudyId: string, publish: boolean): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const row = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null } });
  if (!row) return { ok: false, error: "That case study no longer exists." };
  if (publish && !row.name.trim()) return { ok: false, error: "Add a project name before publishing." };

  await prisma.$transaction(async (tx) => {
    await tx.caseStudy.update({
      where: { id: row.id },
      data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? (row.publishedAt ?? new Date()) : row.publishedAt },
    });
    await snapshot(tx, user.id, row.id, publish ? "Published" : "Unpublished");
    await log(tx, user.id, row.id, publish ? "caseStudy.publish" : "caseStudy.unpublish", `${publish ? "Published" : "Unpublished"} “${row.name}”`);
  });
  revalidate(row.slug);
  return { ok: true };
}

export async function toggleFeatured(caseStudyId: string): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const row = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null } });
  if (!row) return { ok: false, error: "That case study no longer exists." };
  await prisma.$transaction(async (tx) => {
    await tx.caseStudy.update({ where: { id: row.id }, data: { featured: !row.featured } });
    await log(tx, user.id, row.id, "caseStudy.edit", `${row.featured ? "Unfeatured" : "Featured"} “${row.name}”`);
  });
  revalidate(row.slug);
  revalidatePath("/");
  return { ok: true };
}

export async function trashCaseStudy(caseStudyId: string): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const row = await prisma.caseStudy.findFirst({ where: { id: caseStudyId, deletedAt: null } });
  if (!row) return { ok: false, error: "That case study no longer exists." };
  await prisma.$transaction(async (tx) => {
    await tx.caseStudy.update({ where: { id: row.id }, data: { deletedAt: new Date(), featured: false } });
    await log(tx, user.id, row.id, "caseStudy.trash", `Moved “${row.name}” to trash`);
  });
  revalidate(row.slug);
  return { ok: true };
}

export async function reorderCaseStudies(orderedIds: string[]): Promise<Simple> {
  const user = await requireRole("EDITOR");
  const ids = z.array(id).max(500).safeParse(orderedIds);
  if (!ids.success) return { ok: false, error: "That order couldn't be saved." };
  await prisma.$transaction([
    ...ids.data.map((caseStudyId, displayOrder) => prisma.caseStudy.updateMany({ where: { id: caseStudyId }, data: { displayOrder } })),
    prisma.activityLog.create({
      data: { userId: user.id, action: "caseStudy.reorder", entityType: "CaseStudy", entityId: ids.data[0] ?? "", summary: "Changed the display order" },
    }),
  ]);
  revalidate();
  return { ok: true };
}
