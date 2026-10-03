// Removes only test records (zz-* slugs, untouched "untitled" drafts, test
// uploads) and everything hanging off them. Seeded/real content is untouched.
import { prisma } from "@/lib/prisma";
import { objectKeys } from "@/lib/media-view";
import { deleteObjects } from "@/lib/storage";

const TEST_MEDIA = ["hero-photo.jpg", "small-diagram.png", "replacement.jpg"];
const isTest = { OR: [{ slug: { startsWith: "zz-" } }, { slug: { startsWith: "untitled-" } }] };

const cases = await prisma.caseStudy.findMany({ where: isTest, select: { id: true, seoId: true, slug: true } });
const insights = await prisma.insight.findMany({ where: isTest, select: { id: true, seoId: true, slug: true } });
const media = await prisma.media.findMany({ where: { filename: { in: TEST_MEDIA } } });
const ids = [...cases, ...insights].map((r) => r.id);
const seoIds = [...cases, ...insights].map((r) => r.seoId).filter((x): x is string => Boolean(x));

const versions = await prisma.contentVersion.deleteMany({ where: { entityId: { in: ids } } });
const logs = await prisma.activityLog.deleteMany({ where: { entityId: { in: [...ids, ...media.map((m) => m.id)] } } });
const redirects = await prisma.redirect.deleteMany({
  where: { OR: [...cases, ...insights].flatMap((r) => [{ fromPath: { endsWith: `/${r.slug}` } }, { toPath: { endsWith: `/${r.slug}` } }]).concat([{ fromPath: { contains: "/zz-" } }]) },
});
const cs = await prisma.caseStudy.deleteMany({ where: { id: { in: cases.map((c) => c.id) } } });
const ins = await prisma.insight.deleteMany({ where: { id: { in: insights.map((i) => i.id) } } });
const seo = await prisma.seo.deleteMany({ where: { id: { in: seoIds } } });
const tags = await prisma.tag.deleteMany({ where: { slug: { startsWith: "zz-" } } });
await deleteObjects(media.flatMap((m) => objectKeys(m)));
const m = await prisma.media.deleteMany({ where: { id: { in: media.map((x) => x.id) } } });

console.log(`removed: ${cs.count} case studies, ${ins.count} insights, ${m.count} media, ${versions.count} versions, ${seo.count} seo, ${redirects.count} redirects, ${tags.count} tags, ${logs.count} logs`);
console.log(`remaining: caseStudies ${await prisma.caseStudy.count()}, insights ${await prisma.insight.count()}, media ${await prisma.media.count()}, redirects ${await prisma.redirect.count()}`);
await prisma.$disconnect();
