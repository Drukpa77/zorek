import { AdminShell } from "@/components/admin/admin-shell";
import { MediaLibrary } from "@/components/admin/media-library";
import { canAccess } from "@/lib/admin-nav";
import { ACCEPT, toMediaView } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { storageConfigured } from "@/lib/storage";

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; id?: string }> }) {
  const user = await requireRole("AUTHOR");
  const { q = "", id } = await searchParams;
  const query = q.trim().slice(0, 80);
  const contains = { contains: query, mode: "insensitive" as const };

  const [rows, total] = await Promise.all([
    prisma.media.findMany({
      where: { deletedAt: null, ...(query ? { OR: [{ filename: contains }, { alt: contains }, { caption: contains }] } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.media.count({ where: { deletedAt: null } }),
  ]);

  return (
    <AdminShell current="media">
      <MediaLibrary
        items={rows.map(toMediaView)}
        total={total}
        query={query}
        initialId={id ?? null}
        accept={ACCEPT}
        canDelete={canAccess(user.role, "EDITOR")}
        storageReady={storageConfigured()}
      />
    </AdminShell>
  );
}
