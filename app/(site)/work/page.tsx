import type { Metadata } from "next";
import Link from "next/link";
import { WorkIndex } from "@/components/work/work-index";
import { listPublishedCaseStudies } from "@/lib/case-studies";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected digital platforms, software and product work.",
  alternates: { canonical: "/work" },
};

export const revalidate = 300;

async function load() {
  try {
    return await listPublishedCaseStudies();
  } catch (error) {
    // Builds can run without a database; at runtime a failure must surface
    // rather than cache an empty portfolio.
    if (process.env.NEXT_PHASE === "phase-production-build") return [];
    throw error;
  }
}

export default async function WorkPage() {
  const rows = await load();

  return (
    <main className="page-shell">
      <div className="type-mono mb-[3vh] flex justify-between text-label">
        <span>Work · Index</span>
        <span>
          {rows.length} {rows.length === 1 ? "project" : "projects"}
        </span>
      </div>
      <h1 className="type-mega border-b border-ink pb-[3vh]">Work</h1>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-6 py-[10vh]">
          <p className="m-0 max-w-[32ch] text-[clamp(20px,1.8vw,26px)] leading-[1.35] tracking-[-0.015em]">
            Case studies are being prepared. In the meantime, tell us what you&rsquo;re working on.
          </p>
          <Link href="/contact" data-mag="" data-cursor="OPEN ↗" className="btn-accent type-mono-12">
            Start a project ↗
          </Link>
        </div>
      ) : (
        <WorkIndex
          items={rows.map((r) => ({
            slug: r.slug,
            name: r.name,
            client: r.clientName,
            description: r.shortDescription,
            year: r.year,
            type: r.projectType,
            services: r.services,
            hero: r.hero,
          }))}
        />
      )}
    </main>
  );
}
