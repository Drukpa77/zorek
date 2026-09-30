"use server";

import { z } from "zod";
import { signOut } from "@/auth";
import { type AdminKey, adminNav, canAccess } from "@/lib/admin-nav";
import { referenceFor } from "@/lib/enquiry";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

export type SearchHit = { id: string; label: string; kind: string; href: string | null };

const querySchema = z.string().trim().min(2).max(80);

// Content search for the ⌘K palette.
export async function searchAdmin(raw: string): Promise<SearchHit[]> {
  const user = await requireRole("AUTHOR");
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) return [];
  const q = parsed.data;
  const contains = { contains: q, mode: "insensitive" as const };

  const [cases, insights, services, industries, enquiries] = await Promise.all([
    prisma.caseStudy.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { clientName: contains }] },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.insight.findMany({
      where: { deletedAt: null, title: contains },
      select: { id: true, title: true },
      take: 5,
    }),
    prisma.service.findMany({ where: { name: contains }, select: { id: true, name: true }, take: 5 }),
    prisma.industry.findMany({ where: { name: contains }, select: { id: true, name: true }, take: 5 }),
    canAccess(user.role, "EDITOR")
      ? prisma.enquiry.findMany({
          where: { OR: [{ name: contains }, { company: contains }, { email: contains }] },
          select: { id: true, name: true, company: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const hits: SearchHit[] = [
    ...cases.map((c) => ({ id: c.id, label: c.name, kind: "Case study", href: editHref("case-studies", c.id) })),
    ...insights.map((i) => ({ id: i.id, label: i.title, kind: "Insight", href: editHref("insights", i.id) })),
    ...services.map((s) => ({ id: s.id, label: s.name, kind: "Service", href: editHref("services", s.id) })),
    ...industries.map((i) => ({ id: i.id, label: i.name, kind: "Industry", href: editHref("industries", i.id) })),
    ...enquiries.map((e) => ({
      id: e.id,
      label: `${e.name}${e.company ? ` · ${e.company}` : ""}`,
      kind: referenceFor(e.id),
      href: `/admin/enquiries?id=${e.id}`,
    })),
  ];
  return hits.filter((hit) => hit.href !== null);
}

// Content only becomes searchable once its editor exists, so the palette
// never offers a result that leads nowhere.
function editHref(key: AdminKey, id: string) {
  const item = adminNav.flatMap((section) => section.items).find((entry) => entry.key === key);
  return item?.ready ? `${item.href}/${id}` : null;
}
