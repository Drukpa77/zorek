import Link from "next/link";
import { companyName } from "@/lib/brand";

const columns = [
  {
    label: "Navigate",
    links: [
      { label: "Work", href: "/work" },
      { label: "Services", href: "/services/custom-software" },
      { label: "Capabilities", href: "/#capabilities" },
      { label: "About", href: "/about" },
      { label: "Insights", href: "/insights" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "Approach", href: "/about#approach" },
      { label: "Industries", href: "/industries" },
      { label: "Security & Trust", href: "/about#trust" },
      { label: "Start a project", href: "/contact" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
  {
    label: "Contact",
    links: [
      { label: "hello@[domain].com", href: "mailto:hello@example.com" },
      { label: "LinkedIn ↗", href: "#" },
      { label: "GitHub ↗", href: "#" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer data-dark="" className="site-footer">
      <div className="footer-grid">
        {columns.map((column) => (
          <div key={column.label} className="footer-col">
            <span className="type-mono text-on-dark-muted">{column.label}</span>
            {column.links.map((link) =>
              link.href.startsWith("mailto:") || link.href === "#" ? (
                <a key={link.label} href={link.href} className="site-link">
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} href={link.href} className="site-link">
                  {link.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="footer-base type-mono">
        <span>© 2026 {companyName}</span>
        <span>ABN / [Business number]</span>
        <span>Location / Australia</span>
        <a href="#top" className="site-link">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
