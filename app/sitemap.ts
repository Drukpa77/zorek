import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/publishing";
import { siteOrigin } from "@/lib/site-url";

const paths = [
  "/",
  "/work",
  "/services/custom-software",
  "/about",
  "/insights",
  "/industries",
  "/contact",
  "/privacy",
  "/terms",
  "/accessibility",
];

export const revalidate = 300;

async function publishedPaths(): Promise<{ path: string; lastModified: Date }[]> {
  const where = {
    AND: [liveWhere(), { OR: [{ seoId: null }, { seo: { noindex: false } }] }],
  };
  try {
    const [studies, insights] = await Promise.all([
      prisma.caseStudy.findMany({ where, select: { slug: true, updatedAt: true } }),
      prisma.insight.findMany({ where, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...studies.map((row) => ({ path: `/work/${row.slug}`, lastModified: row.updatedAt })),
      ...insights.map((row) => ({ path: `/insights/${row.slug}`, lastModified: row.updatedAt })),
    ];
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") return [];
    throw error;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const lastModified = new Date("2026-09-27");
  const pages = paths.map((path) => ({
    url: path === "/" ? `${origin}/` : `${origin}${path}`,
    lastModified,
  }));
  const content = await publishedPaths();
  return [
    ...pages,
    ...content.map((entry) => ({
      url: `${origin}${entry.path}`,
      lastModified: entry.lastModified,
    })),
  ];
}
