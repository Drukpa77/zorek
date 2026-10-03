import type { Prisma } from "@prisma/client";
import { mediaById } from "@/lib/case-studies";
import { type InsightData, WORDS_PER_MINUTE } from "@/lib/insight-schema";
import { prisma } from "@/lib/prisma";
import { liveDate, liveWhere } from "@/lib/publishing";
import { docMediaIds, headingAnchors, sanitizeDoc, wordCount } from "@/lib/rich-text";

export const insightEditorInclude = {
  tags: { select: { name: true }, orderBy: { name: "asc" } },
  seo: true,
} satisfies Prisma.InsightInclude;

type WithEditor = Prisma.InsightGetPayload<{ include: typeof insightEditorInclude }>;

export function toInsightEditorData(row: WithEditor): InsightData {
  return {
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    categoryId: row.categoryId,
    tags: row.tags.map((t) => t.name),
    body: sanitizeDoc(row.body),
    featuredImageId: row.featuredImageId,
    featured: row.featured,
    publishAt: row.publishAt?.toISOString() ?? null,
    seo: { title: row.seo?.title ?? "", description: row.seo?.description ?? "", noindex: row.seo?.noindex ?? false },
  };
}

export const readingMinutes = (body: unknown) => Math.max(1, Math.round(wordCount(body) / WORDS_PER_MINUTE));

const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  featured: true,
  featuredImageId: true,
  publishedAt: true,
  publishAt: true,
  body: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.InsightSelect;

export async function listLiveInsights() {
  const rows = await prisma.insight.findMany({ where: liveWhere(), select: listSelect });
  // Newest first by the date readers see (scheduled posts use their publish time).
  rows.sort((a, b) => (liveDate(b)?.getTime() ?? 0) - (liveDate(a)?.getTime() ?? 0));
  const media = await mediaById(rows.map((r) => r.featuredImageId));
  return rows.map(({ body, ...row }) => ({
    ...row,
    date: liveDate(row),
    minutes: readingMinutes(body),
    image: row.featuredImageId ? (media.get(row.featuredImageId) ?? null) : null,
  }));
}

export async function getInsightPage(slug: string, preview: boolean) {
  const row = await prisma.insight.findFirst({
    where: preview ? { slug, deletedAt: null } : { slug, ...liveWhere() },
    include: {
      ...insightEditorInclude,
      category: { select: { name: true, slug: true } },
      author: { select: { name: true } },
    },
  });
  if (!row) return null;
  const body = sanitizeDoc(row.body);
  const media = await mediaById([row.featuredImageId, ...docMediaIds(body)]);
  return {
    row,
    body,
    media,
    toc: headingAnchors(body).filter((h) => h.level === 2),
    minutes: readingMinutes(body),
    image: row.featuredImageId ? (media.get(row.featuredImageId) ?? null) : null,
  };
}
