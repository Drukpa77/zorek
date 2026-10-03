import { notFound } from "next/navigation";
import { listInsightVersions } from "@/app/admin/insights/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { InsightEditor } from "@/components/admin/insight-editor";
import { canAccess } from "@/lib/admin-nav";
import { mediaById } from "@/lib/case-studies";
import { insightEditorInclude, toInsightEditorData } from "@/lib/insights";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { docMediaIds } from "@/lib/rich-text";

export default async function EditInsightPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("AUTHOR");
  const { id } = await params;
  const row = await prisma.insight.findFirst({ where: { id, deletedAt: null }, include: insightEditorInclude });
  if (!row) notFound();

  const data = toInsightEditorData(row);
  const [media, categories, versions] = await Promise.all([
    mediaById([data.featuredImageId, ...docMediaIds(data.body)]),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listInsightVersions(id),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  return (
    <AdminShell current="insights">
      <InsightEditor
        id={row.id}
        initial={data}
        initialStatus={row.status}
        initialUpdatedAt={row.updatedAt.toISOString()}
        initialMedia={Object.fromEntries(media)}
        initialVersions={versions}
        categories={categories}
        canPublish={canAccess(user.role, "EDITOR")}
        siteHost={new URL(site).host}
      />
    </AdminShell>
  );
}
