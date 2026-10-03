import type { Prisma } from "@prisma/client";
import { mediaIdsIn, parseBlockData, type BlockType } from "@/lib/blocks";
import { PROJECT_TYPES, type CaseStudyData } from "@/lib/case-study-schema";
import { toMediaView, type MediaView } from "@/lib/media-view";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/publishing";

export * from "@/lib/case-study-schema";

export const editorInclude = {
  blocks: { orderBy: { order: "asc" } },
  seo: true,
} satisfies Prisma.CaseStudyInclude;

type WithEditor = Prisma.CaseStudyGetPayload<{ include: typeof editorInclude }>;

/** The editor's working shape; also what version snapshots store. */
export function toEditorData(row: WithEditor): CaseStudyData {
  return {
    name: row.name,
    clientName: row.clientName,
    slug: row.slug,
    shortDescription: row.shortDescription,
    year: row.year,
    industryId: row.industryId,
    projectType: (PROJECT_TYPES as readonly string[]).includes(row.projectType ?? "") ? (row.projectType as CaseStudyData["projectType"]) : null,
    services: row.services,
    technologies: row.technologies,
    featured: row.featured,
    heroImageId: row.heroImageId,
    seo: { title: row.seo?.title ?? "", description: row.seo?.description ?? "", noindex: row.seo?.noindex ?? false },
    blocks: row.blocks.flatMap((b) => {
      const data = parseBlockData(b.type, b.data);
      return data ? [{ id: b.id, type: b.type as BlockType, hidden: b.hidden, data }] : [];
    }),
  };
}

// ---------- Public reads ----------

export async function mediaById(ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (wanted.length === 0) return new Map<string, MediaView>();
  // Trashed media still resolves: it stays in storage for 30 days so live pages don't break.
  const rows = await prisma.media.findMany({ where: { id: { in: wanted } } });
  return new Map(rows.map((row) => [row.id, toMediaView(row)]));
}


export async function listPublishedCaseStudies() {
  const rows = await prisma.caseStudy.findMany({
    where: liveWhere(),
    orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      clientName: true,
      shortDescription: true,
      year: true,
      projectType: true,
      services: true,
      heroImageId: true,
    },
  });
  const media = await mediaById(rows.map((r) => r.heroImageId));
  return rows.map((row) => ({ ...row, hero: row.heroImageId ? (media.get(row.heroImageId) ?? null) : null }));
}

export async function getCaseStudyPage(slug: string, preview: boolean) {
  const row = await prisma.caseStudy.findFirst({
    where: preview ? { slug, deletedAt: null } : { slug, ...liveWhere() },
    include: { ...editorInclude, industry: { select: { name: true } } },
  });
  if (!row) return null;

  const data = toEditorData(row);
  const visible = data.blocks.filter((b) => !b.hidden);
  const [media, services, published] = await Promise.all([
    mediaById([row.heroImageId, ...visible.flatMap((b) => mediaIdsIn(b.data))]),
    prisma.service.findMany({
      where: { id: { in: visible.flatMap((b) => (b.type === "servicesList" ? (b.data as { serviceIds: string[] }).serviceIds : [])) } },
      select: { id: true, name: true, slug: true, status: true },
    }),
    prisma.caseStudy.findMany({
      where: liveWhere(),
      orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
      select: { slug: true, name: true, clientName: true, services: true, year: true },
    }),
  ]);

  const position = published.findIndex((p) => p.slug === row.slug);
  const next = published.length > 1 ? published[(position + 1) % published.length] : null;

  return {
    row,
    data: { ...data, blocks: visible },
    industry: row.industry?.name ?? null,
    media,
    services: new Map(services.map((s) => [s.id, s])),
    number: position >= 0 ? position + 1 : null,
    next: next && next.slug !== row.slug ? { ...next, number: ((position + 1) % published.length) + 1 } : null,
  };
}
