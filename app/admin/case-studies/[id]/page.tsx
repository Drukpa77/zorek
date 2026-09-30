import { notFound } from "next/navigation";
import { listVersions } from "@/app/admin/case-studies/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { CaseStudyEditor } from "@/components/admin/case-study-editor";
import { canAccess } from "@/lib/admin-nav";
import { mediaIdsIn } from "@/lib/blocks";
import { editorInclude, mediaById, toEditorData } from "@/lib/case-studies";
import { capabilities } from "@/lib/home-content";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

const TECHNOLOGY_OPTIONS = [
  "Figma",
  "React",
  "Next.js",
  "TypeScript",
  "React Native / Expo",
  "Node.js",
  "REST APIs",
  "PostgreSQL",
  "Prisma",
  "AWS",
  "Vercel",
  "GitHub",
];

export default async function EditCaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("AUTHOR");
  const { id } = await params;
  const row = await prisma.caseStudy.findFirst({ where: { id, deletedAt: null }, include: editorInclude });
  if (!row) notFound();

  const data = toEditorData(row);
  const [media, industries, services, versions] = await Promise.all([
    mediaById([data.heroImageId, ...data.blocks.flatMap((b) => mediaIdsIn(b.data))]),
    prisma.industry.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    listVersions(id),
  ]);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  return (
    <AdminShell current="case-studies">
      <CaseStudyEditor
        id={row.id}
        initial={data}
        initialStatus={row.status}
        initialUpdatedAt={row.updatedAt.toISOString()}
        initialMedia={Object.fromEntries(media)}
        initialVersions={versions}
        industries={industries}
        services={services}
        serviceOptions={capabilities.map((c) => c.title)}
        technologyOptions={TECHNOLOGY_OPTIONS}
        canPublish={canAccess(user.role, "EDITOR")}
        siteHost={new URL(site).host}
      />
    </AdminShell>
  );
}
