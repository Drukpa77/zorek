import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { ReadingProgress } from "@/components/insights/reading-progress";
import { RichText } from "@/components/site/rich-text";
import { MissingMedia, Picture } from "@/components/work/picture";
import { getInsightPage } from "@/lib/insights";
import { prisma } from "@/lib/prisma";
import { isLive, liveDate } from "@/lib/publishing";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => {
  const preview = (await draftMode()).isEnabled;
  return { page: await getInsightPage(slug, preview), preview };
});

const date = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });
const pad = (n: number) => String(n).padStart(2, "0");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await load(slug);
  if (!page) return { title: "Insights" };
  const { row, image } = page;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const description = row.seo?.description || row.excerpt || undefined;
  const published = liveDate(row);
  return {
    title: row.seo?.title || row.title,
    description,
    robots: row.seo?.noindex || !isLive(row) ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/insights/${row.slug}` },
    openGraph: {
      type: "article",
      title: row.seo?.title || row.title,
      description,
      publishedTime: published?.toISOString(),
      section: row.category?.name,
      tags: row.tags.map((t) => t.name),
      images: image?.largest && site ? [{ url: new URL(image.largest, site).toString(), alt: image.alt }] : undefined,
    },
  };
}

export default async function InsightPage({ params }: Props) {
  const { slug } = await params;
  const { page, preview } = await load(slug);
  if (!page) {
    const moved = await prisma.redirect.findUnique({ where: { fromPath: `/insights/${slug}` } });
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }

  const { row, body, media, toc, minutes, image } = page;
  const live = isLive(row);
  const published = liveDate(row);

  return (
    <main>
      <ReadingProgress target="article-body" />
      {preview ? (
        <div className="preview-bar" role="status">
          <span>
            Preview ·{" "}
            {live
              ? "Live article with your latest saved changes"
              : row.status === "SCHEDULED" && row.publishAt
                ? `Scheduled for ${date.format(row.publishAt)}, not visible yet`
                : "Draft, not visible to the public"}
          </span>
          <a href={`/api/admin/preview?exit=1&path=/insights/${row.slug}`}>Exit preview</a>
        </div>
      ) : null}

      <article>
        <header className="article-head">
          <div className="article-meta type-mono">
            <Link href="/insights" className="text-label hover:text-acc">
              ← Insights
            </Link>
            {row.category ? <span className="text-acc">{row.category.name}</span> : null}
            {published ? <time dateTime={published.toISOString()}>{date.format(published)}</time> : null}
            <span>{minutes} min read</span>
            <span>By {row.author.name}</span>
          </div>
          <h1 data-in="" className="article-title reveal-rise">
            {row.title}
          </h1>
          {row.excerpt ? <p className="article-dek">{row.excerpt}</p> : null}
        </header>

        {image ? (
          <figure className="article-figure">
            <Picture media={image} sizes="100vw" priority imgClassName="aspect-[21/9] w-full object-cover" />
            {image.caption ? <figcaption className="type-mono mt-3 text-label">{image.caption}</figcaption> : null}
          </figure>
        ) : preview ? (
          <div className="article-figure">
            <MissingMedia label="Featured image · choose one in the editor" className="aspect-[21/9]" />
          </div>
        ) : null}

        <div className="article-layout">
          {toc.length > 1 ? (
            <aside className="article-toc-wrap">
              <nav aria-label="Contents" className="article-toc">
                <span className="type-mono mb-1 text-label">Contents</span>
                {toc.map((h, i) => (
                  <a key={h.id} href={`#${h.id}`}>
                    <span className="font-mono text-[11px] text-acc">{pad(i + 1)}</span> {h.text}
                  </a>
                ))}
              </nav>
            </aside>
          ) : (
            <span aria-hidden="true" />
          )}
          <div id="article-body" className="article-body">
            {body.content.length ? (
              <RichText doc={body} media={media} className="article-prose" />
            ) : preview ? (
              <p className="preview-note">This article has no body yet.</p>
            ) : null}
            {row.tags.length ? (
              <ul className="article-tags" aria-label="Tags">
                {row.tags.map((t) => (
                  <li key={t.name}>{t.name}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </article>

      <Link href="/contact" data-dark="" data-cursor="OPEN ↗" className="article-cta">
        <span className="type-mono mb-[3vh] block text-on-dark-muted">{row.category ? `Thinking about ${row.category.name.toLowerCase()}?` : "Have a project in mind?"}</span>
        <span className="article-cta-title">Talk it through with us →</span>
      </Link>
    </main>
  );
}
