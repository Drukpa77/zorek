import type { Prisma, Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Version history shared by every editable content type.

export type VersionEntity = "CaseStudy" | "Insight";
export type VersionView = { id: string; label: string; when: string; by: string };

const versionDate = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Australia/Sydney",
});

export async function versionsFor(entityType: VersionEntity, entityId: string): Promise<VersionView[]> {
  const rows = await prisma.contentVersion.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { createdBy: { select: { name: true } } },
  });
  return rows.map((v) => ({
    id: v.id,
    label: String((v.snapshot as { label?: string }).label ?? "Saved"),
    when: versionDate.format(v.createdAt),
    by: v.createdBy.name,
  }));
}

export async function saveVersion(
  tx: Prisma.TransactionClient,
  input: { entityType: VersionEntity; entityId: string; userId: string; label: string; status: Status; data: unknown },
) {
  await tx.contentVersion.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      createdById: input.userId,
      snapshot: { label: input.label, status: input.status, data: input.data } as Prisma.InputJsonValue,
    },
  });
}

export async function versionData(entityType: VersionEntity, entityId: string, versionId: string) {
  const version = await prisma.contentVersion.findFirst({ where: { id: versionId, entityType, entityId } });
  return version ? (version.snapshot as { data?: unknown }).data : undefined;
}
