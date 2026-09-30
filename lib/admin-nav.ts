import type { Role } from "@prisma/client";

// Single source for the admin information architecture: sidebar, breadcrumb,
// command palette and role gating all read from here.

export type AdminKey =
  | "dashboard"
  | "case-studies"
  | "insights"
  | "services"
  | "industries"
  | "pages"
  | "media"
  | "navigation"
  | "redirects"
  | "enquiries"
  | "users"
  | "settings";

export type CountKey = "caseStudies" | "insights" | "services" | "industries" | "media" | "redirects" | "enquiries";

export type AdminNavItem = {
  key: AdminKey;
  label: string;
  href: string;
  crumb: string;
  minRole: Role;
  /** False until the screen is built: shown in the sidebar, not linked. */
  ready: boolean;
  count?: CountKey;
};

export const adminNav: { group: string; items: AdminNavItem[] }[] = [
  {
    group: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", href: "/admin", crumb: "Dashboard", minRole: "AUTHOR", ready: true }],
  },
  {
    group: "Content",
    items: [
      { key: "case-studies", label: "Case Studies", href: "/admin/case-studies", crumb: "Content / Case studies", minRole: "AUTHOR", ready: true, count: "caseStudies" },
      { key: "insights", label: "Insights", href: "/admin/insights", crumb: "Content / Insights", minRole: "AUTHOR", ready: false, count: "insights" },
      { key: "services", label: "Services", href: "/admin/services", crumb: "Content / Services", minRole: "EDITOR", ready: false, count: "services" },
      { key: "industries", label: "Industries", href: "/admin/industries", crumb: "Content / Industries", minRole: "EDITOR", ready: false, count: "industries" },
      { key: "pages", label: "Pages", href: "/admin/pages", crumb: "Pages / Homepage", minRole: "EDITOR", ready: false },
      { key: "media", label: "Media Library", href: "/admin/media", crumb: "Media library", minRole: "AUTHOR", ready: true, count: "media" },
    ],
  },
  {
    group: "Site",
    items: [
      { key: "navigation", label: "Navigation", href: "/admin/navigation", crumb: "Site / Navigation", minRole: "ADMIN", ready: false },
      { key: "redirects", label: "SEO / Redirects", href: "/admin/redirects", crumb: "SEO / Redirects", minRole: "ADMIN", ready: false, count: "redirects" },
      { key: "enquiries", label: "Enquiries", href: "/admin/enquiries", crumb: "Forms / Enquiries", minRole: "EDITOR", ready: true, count: "enquiries" },
    ],
  },
  {
    group: "System",
    items: [
      { key: "users", label: "Users", href: "/admin/users", crumb: "System / Users", minRole: "SUPER_ADMIN", ready: false },
      { key: "settings", label: "Settings", href: "/admin/settings", crumb: "System / Settings", minRole: "ADMIN", ready: false },
    ],
  },
];

const rank: Record<Role, number> = { AUTHOR: 1, EDITOR: 2, ADMIN: 3, SUPER_ADMIN: 4 };

export const canAccess = (role: Role, minimum: Role) => rank[role] >= rank[minimum];

export function navForRole(role: Role) {
  return adminNav
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(role, item.minRole)) }))
    .filter((section) => section.items.length > 0);
}

export const crumbFor = (key: AdminKey) =>
  adminNav.flatMap((section) => section.items).find((item) => item.key === key)?.crumb ?? "";
