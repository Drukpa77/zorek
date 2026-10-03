import { AdminShell } from "@/components/admin/admin-shell";
import { InsightTable, type InsightRow } from "@/components/admin/insight-table";
import { canAccess } from "@/lib/admin-nav";
import { mediaById } from "@/lib/case-studies";
import { statusLabel } from "@/lib/content-status";
import { prisma } from "@/lib/prisma";
import { isLive, liveDate } from "@/lib/publishing";
import { requireRole } from "@/lib/require-role";

const date = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });
const dateTime = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Australia/Sydney" });

export default async function InsightsAdminPage() {
  const user = await requireRole("AUTHOR");
  const rows = await prisma.insight.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { name: true } }, tags: { select: { name: true } } },
  });
  const media = await mediaById(rows.map((r) => r.featuredImageId));
  const now = new Date();

  const view: InsightRow[] = rows.map((row) => {
    const live = isLive(row, now);
    const when = liveDate(row);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category?.name ?? "—",
      tags: row.tags.map((t) => t.name).join(", ") || "—",
      status: row.status,
      statusLabel: row.status === "SCHEDULED" && live ? "Live (scheduled)" : statusLabel[row.status],
      featured: row.featured,
      published: live && when ? date.format(when) : row.status === "SCHEDULED" && row.publishAt ? `Goes live ${dateTime.format(row.publishAt)}` : "—",
      updated: date.format(row.updatedAt),
      thumb: row.featuredImageId ? (media.get(row.featuredImageId)?.thumb ?? null) : null,
    };
  });

  return (
    <AdminShell current="insights">
      <InsightTable rows={view} canPublish={canAccess(user.role, "EDITOR")} />
    </AdminShell>
  );
}
