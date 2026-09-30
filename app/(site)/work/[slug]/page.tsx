import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { CaseStudyBlocks, countNumbered } from "@/components/work/case-study-blocks";
import { MissingMedia, Picture } from "@/components/work/picture";
import { getCaseStudyPage } from "@/lib/case-studies";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export function generateStaticParams() {
  // Rendered on first request, then cached; saves revalidate the path.
  return [];
}

type Props = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => {
  const preview = (await draftMode()).isEnabled;
  return { page: await getCaseStudyPage(slug, preview), preview };
});

const pad = (n: number) => String(n).padStart(2, "0");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await load(slug);
  if (!page) return { title: "Work" };
  const { row, data, media } = page;
  const hero = data.heroImageId ? media.get(data.heroImageId) : undefined;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const description = data.seo.description || data.shortDescription || undefined;
  return {
    title: data.seo.title || data.name,
    description,
    robots: data.seo.noindex || row.status !== "PUBLISHED" ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/work/${row.slug}` },
    openGraph: {
      title: data.seo.title || data.name,
      description,
      type: "article",
      images: hero?.largest && site ? [{ url: new URL(hero.largest, site).toString(), alt: hero.alt }] : undefined,
    },
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const { page, preview } = await load(slug);

  if (!page) {
    // A live page whose slug changed keeps its old link working.
    const moved = await prisma.redirect.findUnique({ where: { fromPath: `/work/${slug}` } });
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }

  const { row, data, industry, media, services, number, next } = page;
  const hero = data.heroImageId ? media.get(data.heroImageId) : undefined;
  const hasBlock = (type: string) => data.blocks.some((b) => b.type === type);
  const blockCtx = { media, services, preview };
  const numbered = countNumbered(data.blocks, blockCtx);
  let tail = numbered;
  const autoTech = !hasBlock("technologyList") && data.technologies.length > 0;
  const autoServices = !hasBlock("servicesList") && data.services.length > 0;

  return (
    <main>
      {preview ? (
        <div className="preview-bar" role="status">
          <span>
            Preview · {row.status === "PUBLISHED" ? "Live page with your latest saved changes" : "Draft, not visible to the public"}
          </span>
          <a href={`/api/admin/preview?exit=1&path=/work/${row.slug}`}>Exit preview</a>
        </div>
      ) : null}

      <section className="cs-hero">
        <div className="cs-meta type-mono">
          <Link href="/work" className="text-label hover:text-acc">
            ← All work
          </Link>
          {number ? <span className="text-acc">Project / {pad(number)}</span> : <span className="text-acc">Project / draft</span>}
          {data.clientName ? <span>{data.clientName}</span> : null}
          {industry ? <span>Industry / {industry}</span> : null}
          {data.year ? <span>{data.year}</span> : null}
          {data.projectType ? <span className="text-right">Type / {data.projectType}</span> : null}
        </div>
        <h1 data-in="" className="cs-title reveal-rise">
          {data.name}
        </h1>
        <div className="cs-hero-foot">
          {data.shortDescription ? <p className="cs-statement">{data.shortDescription}</p> : <span />}
          {data.services.length || data.year || data.projectType ? (
            <dl className="cs-facts type-mono">
              {data.services.length ? (
                <>
                  <dt>Role</dt>
                  <dd>{data.services.join(", ")}</dd>
                </>
              ) : null}
              {data.year ? (
                <>
                  <dt>Year</dt>
                  <dd>{data.year}</dd>
                </>
              ) : null}
              {data.projectType ? (
                <>
                  <dt>Platform</dt>
                  <dd>{data.projectType}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>

      {hero ? (
        <div data-prog="" className="cs-hero-visual">
          <Picture media={hero} sizes="100vw" priority className="cs-hero-picture" imgClassName="size-full object-cover" />
          {data.technologies.length ? (
            <div className="cs-annotations" aria-hidden="true">
              {data.technologies.slice(0, 4).map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : preview ? (
        <div className="cs-bleed-pad">
          <MissingMedia label="Hero image · choose one in the editor" className="h-[60vh]" />
        </div>
      ) : null}

      <div className="cs-blocks">
        <CaseStudyBlocks blocks={data.blocks} {...blockCtx} />
      </div>

      {autoTech || autoServices ? (
        <section className="cs-section cs-two-col">
          {autoTech ? (
            <div>
              <h2 className="type-mono m-0 border-b border-ink pb-3 font-normal">
                <span className="text-acc">{pad(++tail)}</span> Technology
              </h2>
              <ul className="cs-list">
                {data.technologies.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {autoServices ? (
            <div>
              <h2 className="type-mono m-0 border-b border-ink pb-3 font-normal">
                <span className="text-acc">{pad(++tail)}</span> Services
              </h2>
              <ul className="cs-list">
                {data.services.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {next ? (
        <Link href={`/work/${next.slug}`} data-dark="" data-cursor="NEXT ↗" className="cs-next" aria-label={`Next project: ${next.name}`}>
          <span className="type-mono mb-[5vh] flex justify-between text-on-dark-muted">
            <span>
              <span className="text-acc-on-dark">{pad(tail + 1)}</span> Next project
            </span>
            <span>Project / {pad(next.number)}</span>
          </span>
          <span className="cs-next-title">{next.name} →</span>
          <span className="type-mono mt-5 block text-on-dark-muted">
            {[next.clientName, ...next.services.slice(0, 3), next.year].filter(Boolean).join(" · ")}
          </span>
        </Link>
      ) : null}
    </main>
  );
}
