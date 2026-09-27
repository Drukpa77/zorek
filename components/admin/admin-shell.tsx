import Link from "next/link";
import { signOut } from "@/auth";
import { companyName } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function AdminShell({
  current,
  children,
}: {
  current: "overview" | "enquiries";
  children: React.ReactNode;
}) {
  await requireRole("AUTHOR");
  const fresh = await prisma.enquiry.count({ where: { status: "NEW", archivedAt: null } });

  const item = (key: "overview" | "enquiries", href: string, label: string, count?: number) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className={`flex min-h-11 items-center justify-between gap-3 px-3 text-[14px] ${
        current === key ? "bg-white text-ink" : "text-on-dark-body hover:text-on-dark"
      }`}
    >
      <span>{label}</span>
      {count ? <span className="font-mono text-[11px] text-acc-on-dark">{count}</span> : null}
    </Link>
  );

  return (
    <div className="min-h-dvh bg-a-bg md:grid md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-6 bg-dark px-3 py-5 text-on-dark md:min-h-dvh">
        <div className="px-3">
          <p className="font-mono text-[10px] tracking-[0.08em] text-on-dark-muted uppercase">Admin</p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em]">{companyName}</p>
        </div>
        <nav aria-label="Admin" className="flex flex-col gap-1">
          {item("overview", "/admin", "Overview")}
          {item("enquiries", "/admin/enquiries", "Enquiries", fresh)}
        </nav>
        <form
          className="mt-auto px-3"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button type="submit" className="min-h-11 text-[14px] text-on-dark-body">
            Sign out
          </button>
        </form>
      </aside>
      <div className="px-[var(--pad-x)] py-8">{children}</div>
    </div>
  );
}
