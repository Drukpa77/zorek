import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { EnquiryDetail, statusBadge, type EnquiryView } from "@/components/admin/enquiry-detail";
import { referenceFor } from "@/lib/enquiry";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

const dateFormat = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Australia/Sydney",
});

const noteFormat = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Australia/Sydney",
});

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; archived?: string }>;
}) {
  await requireRole("EDITOR");
  const { id, archived } = await searchParams;
  const showArchived = archived === "1";
  const rows = await prisma.enquiry.findMany({
    where: { archivedAt: showArchived ? { not: null } : null },
    orderBy: { createdAt: "desc" },
    include: {
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });

  const views: EnquiryView[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company || "—",
    email: row.email,
    phone: row.phone || "—",
    project: row.projectTypes.join(", ") || "—",
    existing: [row.existingSystem, row.existingUrl].filter(Boolean).join(" — ") || "—",
    budget: row.budget || "—",
    timeline: row.timeline || "—",
    description: row.description || "—",
    date: dateFormat.format(row.createdAt),
    status: row.status,
    archived: Boolean(row.archivedAt),
    notes: row.notes.map((note) => ({
      id: note.id,
      body: note.body,
      author: note.author.name,
      date: noteFormat.format(note.createdAt),
    })),
  }));

  const selected = views.find((row) => row.id === id) ?? views[0] ?? null;
  const hrefFor = (enquiryId: string) =>
    `/admin/enquiries?id=${enquiryId}${showArchived ? "&archived=1" : ""}`;

  return (
    <AdminShell current="enquiries">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.08em] text-label uppercase">Forms · Start a project</p>
          <h1 className="mt-2 text-[clamp(28px,3vw,38px)] font-semibold tracking-[-0.04em]">Enquiries</h1>
        </div>
        <Link href={showArchived ? "/admin/enquiries" : "/admin/enquiries?archived=1"} className="min-h-11 text-[14px] text-label">
          {showArchived ? "Show open" : "Show archived"}
        </Link>
      </div>
      {views.length === 0 ? (
        <p className="text-[15px] text-muted">{showArchived ? "No archived enquiries." : "No enquiries yet."}</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <div className="overflow-x-auto border border-a-border bg-a-panel">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.08em] text-faint uppercase">
                  {["Name", "Company", "Project", "Budget", "Timeline", "Date", "Status"].map((heading) => (
                    <th key={heading} className="border-b border-a-border px-3.5 py-3 font-normal">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {views.map((row) => {
                  const colors = statusBadge(row.status);
                  const current = selected?.id === row.id;
                  return (
                    <tr key={row.id} className={current ? "bg-a-row" : "bg-a-panel"}>
                      <td className="border-b border-a-row px-3.5 py-3">
                        <Link href={hrefFor(row.id)} className={row.status === "NEW" ? "font-semibold" : undefined}>
                          {row.name}
                        </Link>
                        <span className="mt-1 block font-mono text-[10px] text-faint">{referenceFor(row.id)}</span>
                      </td>
                      <td className="border-b border-a-row px-3.5 py-3 text-label">{row.company}</td>
                      <td className="border-b border-a-row px-3.5 py-3 text-label">{row.project}</td>
                      <td className="border-b border-a-row px-3.5 py-3 text-label">{row.budget}</td>
                      <td className="border-b border-a-row px-3.5 py-3 text-label">{row.timeline}</td>
                      <td className="border-b border-a-row px-3.5 py-3 font-mono text-[11px] text-label">{row.date}</td>
                      <td className="border-b border-a-row px-3.5 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.04em]"
                          style={{ background: colors.bg, color: colors.fg }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selected ? <EnquiryDetail key={selected.id} enquiry={selected} /> : null}
        </div>
      )}
    </AdminShell>
  );
}
