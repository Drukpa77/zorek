export const mainNav = [
  { label: "Work", href: "/work", key: "work" },
  { label: "Services", href: "/services/custom-software", key: "services" },
  { label: "Capabilities", href: "/#capabilities", key: "capabilities" },
  { label: "About", href: "/about", key: "about" },
  { label: "Insights", href: "/insights", key: "insights" },
] as const;

export const menuNav = [
  ...mainNav,
  { label: "Contact", href: "/contact", key: "contact" },
] as const;

export function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

export function isCurrent(key: string, pathname: string, hash: string) {
  switch (key) {
    case "work":
      return pathname === "/work" || pathname.startsWith("/work/");
    case "services":
      return pathname.startsWith("/services");
    case "capabilities":
      return pathname === "/" && hash === "#capabilities";
    case "about":
      return pathname === "/about";
    case "insights":
      return pathname === "/insights" || pathname.startsWith("/insights/");
    case "contact":
      return pathname === "/contact";
    default:
      return false;
  }
}
