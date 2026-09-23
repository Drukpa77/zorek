import { unstable_cache } from "next/cache";
import { mainNav } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";

export type NavEntry = { label: string; href: string; key: string };

function keyFor(href: string) {
  if (href.startsWith("/work")) return "work";
  if (href.startsWith("/services")) return "services";
  if (href.includes("capabilities")) return "capabilities";
  if (href.startsWith("/about")) return "about";
  if (href.startsWith("/insights")) return "insights";
  if (href.startsWith("/contact")) return "contact";
  return href;
}

const fallbackNav: NavEntry[] = mainNav.map((item) => ({
  label: item.label,
  href: item.href,
  key: item.key,
}));

const loadNav = unstable_cache(
  async () => {
    const items = await prisma.navigationItem.findMany({
      where: { menu: "main", visible: true },
      orderBy: { order: "asc" },
    });
    if (items.length === 0) return fallbackNav;
    return items.map((item) => ({
      label: item.label,
      href: item.href,
      key: keyFor(item.href),
    }));
  },
  ["main-nav"],
  { tags: ["navigation"] },
);

export async function getMainNav(): Promise<NavEntry[]> {
  try {
    return await loadNav();
  } catch {
    return fallbackNav;
  }
}
