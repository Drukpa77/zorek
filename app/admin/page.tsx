import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export default async function AdminPage() {
  const user = await requireRole("AUTHOR");
  const fresh = await prisma.enquiry.count({ where: { status: "NEW", archivedAt: null } });

  return (
    <AdminShell current="overview">
      <p className="font-mono text-[10px] tracking-[0.08em] text-label uppercase">Admin · Overview</p>
      <h1 className="mt-3 text-[clamp(30px,3.4vw,44px)] font-semibold tracking-[-0.04em]">
        Signed in as {user.name}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-normal text-muted">
        {user.email} · {user.role.replaceAll("_", " ")}
      </p>
      <Link
        href="/admin/enquiries"
        className="mt-8 block max-w-sm border border-a-border bg-a-panel p-5"
      >
        <span className="font-mono text-[10px] tracking-[0.08em] text-label uppercase">New enquiries</span>
        <span className="mt-2 block text-[40px] leading-none font-semibold tracking-[-0.04em]">{fresh}</span>
        <span className="mt-3 block text-[14px] text-muted">Awaiting a reply</span>
      </Link>
    </AdminShell>
  );
}
