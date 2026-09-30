import { AdminShell } from "@/components/admin/admin-shell";
import { CaseStudyTable, type CaseStudyRow } from "@/components/admin/case-study-table";
import { canAccess } from "@/lib/admin-nav";
import { mediaById, statusLabel } from "@/lib/case-studies";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

const date = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });

export default async function CaseStudiesPage() {
  const user = await requireRole("AUTHOR");
  const rows = await prisma.caseStudy.findMany({
    where: { deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
    include: { industry: { select: { name: true } } },
  });
  const media = await mediaById(rows.map((r) => r.heroImageId));

  const view: CaseStudyRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    client: row.clientName || "—",
    industry: row.industry?.name ?? "—",
    status: row.status,
    statusLabel: statusLabel[row.status],
    featured: row.featured,
    published: row.publishedAt && row.status === "PUBLISHED" ? date.format(row.publishedAt) : "—",
    updated: date.format(row.updatedAt),
    thumb: row.heroImageId ? (media.get(row.heroImageId)?.thumb ?? null) : null,
  }));

  return (
    <AdminShell current="case-studies">
      <CaseStudyTable rows={view} canPublish={canAccess(user.role, "EDITOR")} />
    </AdminShell>
  );
}
