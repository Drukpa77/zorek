import { signOutAction } from "@/app/admin/actions";
import { AdminFrame, type FrameNavItem } from "@/components/admin/admin-frame";
import { type AdminKey, type CountKey, crumbFor, navForRole } from "@/lib/admin-nav";
import { companyName } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

const live = { deletedAt: null };

async function loadCounts(): Promise<Record<CountKey, number>> {
  const [caseStudies, insights, services, industries, media, redirects, enquiries] = await Promise.all([
    prisma.caseStudy.count({ where: live }),
    prisma.insight.count({ where: live }),
    prisma.service.count(),
    prisma.industry.count(),
    prisma.media.count({ where: live }),
    prisma.redirect.count(),
    prisma.enquiry.count({ where: { status: "NEW", archivedAt: null } }),
  ]);
  return { caseStudies, insights, services, industries, media, redirects, enquiries };
}

const initialsFor = (name: string) =>
  name
    .replace(/[[\]]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

export async function AdminShell({ current, children }: { current: AdminKey; children: React.ReactNode }) {
  const user = await requireRole("AUTHOR");
  const counts = await loadCounts();

  const nav = navForRole(user.role).map((section) => ({
    group: section.group,
    items: section.items.map<FrameNavItem>((item) => ({
      key: item.key,
      label: item.label,
      href: item.href,
      ready: item.ready,
      count: item.count ? counts[item.count] : null,
      // Only new enquiries are an action item; the other counts are inventory.
      alert: item.key === "enquiries" && counts.enquiries > 0,
    })),
  }));

  const name = user.name ?? user.email ?? "Admin";

  return (
    <AdminFrame
      nav={nav}
      current={current}
      crumb={crumbFor(current)}
      companyName={companyName}
      user={{ name, role: user.role.replaceAll("_", " "), initials: initialsFor(name) }}
      signOutAction={signOutAction}
    >
      {children}
    </AdminFrame>
  );
}
