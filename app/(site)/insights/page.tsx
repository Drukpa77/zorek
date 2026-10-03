import type { Metadata } from "next";
import { InsightsIndex } from "@/components/insights/insights-index";
import { listLiveInsights } from "@/lib/insights";

export const metadata: Metadata = {
  title: "Insights",
  description: "Notes on building software that holds up: strategy, delivery, engineering, accessibility and quality.",
  alternates: { canonical: "/insights" },
};

export const revalidate = 300;

const date = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });

async function load() {
  try {
    return await listLiveInsights();
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") return [];
    throw error;
  }
}

export default async function InsightsPage() {
  const rows = await load();
  const categories = [...new Set(rows.map((r) => r.category?.name).filter((c): c is string => Boolean(c)))];

  return (
    <main className="page-shell">
      <div className="type-mono mb-[3vh] flex justify-between gap-4 text-label">
        <span>Journal · Notes on building software that holds up</span>
        <span className="shrink-0">
          {rows.length} {rows.length === 1 ? "article" : "articles"}
        </span>
      </div>
      <h1 className="type-mega border-b border-ink pb-[3vh]">Insights</h1>
      {rows.length === 0 ? (
        <p className="py-[10vh] text-[clamp(20px,1.8vw,26px)] text-muted">The first articles are being written. Check back soon.</p>
      ) : (
        <InsightsIndex
          categories={categories}
          items={rows.map((r) => ({
            slug: r.slug,
            title: r.title,
            excerpt: r.excerpt ?? "",
            category: r.category?.name ?? null,
            date: r.date ? date.format(r.date) : null,
            minutes: r.minutes,
            featured: r.featured,
            image: r.image,
          }))}
        />
      )}
    </main>
  );
}
