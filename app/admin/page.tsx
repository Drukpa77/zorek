import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { type AdminKey, adminNav } from "@/lib/admin-nav";
import { toMediaView } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

const TZ = "Australia/Sydney";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const headerDate = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const clock = new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: TZ });

function when(date: Date, now: Date) {
  const today = dayKey.format(now);
  const yesterday = dayKey.format(new Date(now.getTime() - 86_400_000));
  const day = dayKey.format(date);
  if (day === today) return clock.format(date);
  if (day === yesterday) return "Yesterday";
  return shortDate.format(date);
}

function dotFor(action: string) {
  if (/publish/.test(action)) return "#1E6B3A";
  if (/delete|trash|archive/.test(action)) return "#A33A2A";
  if (/edit|update|status|note/.test(action)) return "#5A32D6";
  return "#5C5B56";
}

const screen = (key: AdminKey) => adminNav.flatMap((section) => section.items).find((item) => item.key === key)!;

export default async function AdminPage() {
  const user = await requireRole("AUTHOR");
  const now = new Date();
  const live = { deletedAt: null };
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    publishedCases,
    featuredCases,
    publishedInsights,
    scheduledInsights,
    draftCases,
    draftInsights,
    publishedServices,
    totalServices,
    newEnquiries,
    activity,
    latestEnquiries,
    pages,
    enquiriesThisMonth,
    uploads,
  ] = await Promise.all([
    prisma.caseStudy.count({ where: { ...live, status: "PUBLISHED" } }),
    prisma.caseStudy.count({ where: { ...live, featured: true } }),
    prisma.insight.count({ where: { ...live, status: "PUBLISHED" } }),
    prisma.insight.count({ where: { ...live, status: "SCHEDULED" } }),
    prisma.caseStudy.count({ where: { ...live, status: "DRAFT" } }),
    prisma.insight.count({ where: { ...live, status: "DRAFT" } }),
    prisma.service.count({ where: { status: "PUBLISHED" } }),
    prisma.service.count(),
    prisma.enquiry.count({ where: { status: "NEW", archivedAt: null } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { id: true, name: true } } } }),
    prisma.enquiry.findMany({ where: { status: "NEW", archivedAt: null }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.page.findMany({ where: { key: { in: ["home", "about"] } }, select: { key: true, status: true, updatedAt: true } }),
    prisma.enquiry.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.media.findMany({ where: live, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const stats = [
    { label: "Published case studies", value: publishedCases, note: `${featuredCases} featured`, key: "case-studies" as const },
    { label: "Published insights", value: publishedInsights, note: `${scheduledInsights} scheduled`, key: "insights" as const },
    { label: "Drafts", value: draftCases + draftInsights, note: "Across all content", key: "case-studies" as const },
    {
      label: "Services",
      value: publishedServices,
      note: totalServices === publishedServices ? "All published" : `${totalServices - publishedServices} unpublished`,
      key: "services" as const,
    },
    { label: "New enquiries", value: newEnquiries, note: "Awaiting reply", key: "enquiries" as const },
  ];

  const actions: { label: string; key: AdminKey; primary?: boolean }[] = [
    { label: "+ New case study", key: "case-studies", primary: true },
    { label: "+ New article", key: "insights" },
    { label: "↑ Upload media", key: "media" },
    { label: "Edit homepage", key: "pages" },
  ];

  const pageStatus = (key: string, label: string) => {
    const page = pages.find((p) => p.key === key);
    if (!page) return { label, value: "Not in CMS yet", tone: "text-label" };
    const published = page.status === "PUBLISHED";
    return {
      label,
      value: `${published ? "Published" : page.status.charAt(0) + page.status.slice(1).toLowerCase()} · ${shortDate.format(page.updatedAt)}`,
      tone: published ? "text-[#1E6B3A]" : "text-label",
    };
  };
  const contentStatus = [
    pageStatus("home", "Homepage"),
    pageStatus("about", "About"),
    { label: "Contact form", value: `Receiving · ${enquiriesThisMonth} in 30 days`, tone: "text-[#1E6B3A]" },
  ];
  const allLive = contentStatus.every((row) => row.tone === "text-[#1E6B3A]");
  const firstName = (user.name ?? "").replace(/[[\]]/g, "").split(" ")[0];

  return (
    <AdminShell current="dashboard">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow mb-2">Dashboard · {headerDate.format(now)}</p>
          <h1 className="admin-h1">Welcome back{firstName && firstName !== "Founder" ? `, ${firstName}` : ""}.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const target = screen(action.key);
            return target.ready ? (
              <Link key={action.label} href={target.href} className={action.primary ? "admin-btn-primary" : "admin-btn"}>
                {action.label}
              </Link>
            ) : (
              <span key={action.label} className="admin-btn" aria-disabled="true">
                {action.label} <span className="admin-soon-light">Soon</span>
              </span>
            );
          })}
        </div>
      </div>

      <ul className="admin-stats" aria-label="Content summary">
        {stats.map((stat) => {
          const target = screen(stat.key);
          const body = (
            <>
              <span className="admin-eyebrow">{stat.label}</span>
              <span className="text-[34px] leading-none font-semibold tracking-[-0.04em]">{stat.value}</span>
              <span className="text-[12px] text-label">{stat.note}</span>
            </>
          );
          return (
            <li key={stat.label}>
              {target.ready ? (
                <Link href={target.href} className="admin-stat">
                  {body}
                </Link>
              ) : (
                <div className="admin-stat">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <section className="admin-panel" aria-labelledby="activity-title">
          <div className="admin-panel-head">
            <h2 id="activity-title" className="admin-h2">
              Recent activity
            </h2>
            <span className="font-mono text-[10px] text-label">AUDIT LOG</span>
          </div>
          {activity.length === 0 ? (
            <p className="admin-empty">Nothing yet. Edits, publishes and enquiry updates will appear here.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {activity.map((entry) => (
                <li key={entry.id} className="admin-activity">
                  <span aria-hidden="true" className="size-[6px]" style={{ background: dotFor(entry.action) }} />
                  <span className="text-[13.5px] leading-[1.4]">
                    <strong className="font-semibold">{entry.user.id === user.id ? "You" : entry.user.name}</strong>
                    {" · "}
                    {entry.summary}{" "}
                    <span className="font-mono text-[10px] tracking-[0.06em] text-label uppercase">{entry.entityType}</span>
                  </span>
                  <time dateTime={entry.createdAt.toISOString()} className="font-mono text-[10px] whitespace-nowrap text-label">
                    {when(entry.createdAt, now)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="admin-panel" aria-labelledby="new-enquiries-title">
            <div className="admin-panel-head">
              <h2 id="new-enquiries-title" className="admin-h2">
                New enquiries
              </h2>
              <Link href="/admin/enquiries" className="text-[12px] text-label hover:text-ink">
                View all →
              </Link>
            </div>
            {latestEnquiries.length === 0 ? (
              <p className="admin-empty">No new enquiries. You&rsquo;re all caught up.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {latestEnquiries.map((enquiry) => (
                  <li key={enquiry.id}>
                    <Link href={`/admin/enquiries?id=${enquiry.id}`} className="admin-enquiry">
                      <span className="truncate font-medium">
                        {enquiry.name}
                        {enquiry.company ? <span className="font-normal text-label"> · {enquiry.company}</span> : null}
                      </span>
                      <span className="admin-badge-new">NEW</span>
                      <span className="truncate text-[12px] text-label">
                        {[enquiry.projectTypes.join(", "), enquiry.budget].filter(Boolean).join(" · ") || "No details"}
                      </span>
                      <span className="font-mono text-[10px] text-label">{when(enquiry.createdAt, now)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-panel px-[18px] py-4" aria-labelledby="status-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="status-title" className="admin-h2">
                Website content status
              </h2>
              {allLive ? <span className="font-mono text-[10px] text-[#1E6B3A]">● ALL LIVE</span> : null}
            </div>
            <dl className="m-0">
              {contentStatus.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 border-t border-a-row py-2 text-[13px]">
                  <dt>{row.label}</dt>
                  <dd className={`m-0 font-mono text-[11px] ${row.tone}`}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="admin-panel px-[18px] py-4" aria-labelledby="uploads-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="uploads-title" className="admin-h2">
                Recent uploads
              </h2>
              {screen("media").ready ? (
                <Link href="/admin/media" className="text-[12px] text-label hover:text-ink">
                  Library →
                </Link>
              ) : null}
            </div>
            {uploads.length === 0 ? (
              <p className="m-0 text-[13px] text-label">No uploads yet.</p>
            ) : (
              <ul className="m-0 grid list-none grid-cols-4 gap-1.5 p-0">
                {uploads.map(toMediaView).map((file) => (
                  <li key={file.id} className="admin-thumb overflow-hidden">
                    <Link href={`/admin/media?id=${file.id}`} className="block size-full" title={file.filename}>
                      {file.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.thumb}
                          alt={file.alt || file.filename}
                          loading="lazy"
                          className="size-full object-cover"
                          style={{ objectPosition: `${file.focalX * 100}% ${file.focalY * 100}%` }}
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center font-mono text-[9px]">
                          {file.ext}
                          <span className="sr-only"> {file.filename}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
