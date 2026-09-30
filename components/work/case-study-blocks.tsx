import Link from "next/link";
import type { ReactNode } from "react";
import { RichText } from "@/components/site/rich-text";
import { BeforeAfter, VideoBlock } from "@/components/work/interactive";
import { MissingMedia, Picture } from "@/components/work/picture";
import type { BlockData, BlockType } from "@/lib/blocks";
import type { MediaView } from "@/lib/media";
import { safeHref } from "@/lib/rich-text";

type Block = { type: BlockType; data: unknown };
type Ctx = {
  media: Map<string, MediaView>;
  services: Map<string, { name: string; slug: string; status: string }>;
  preview: boolean;
  number: () => string;
};

const pad = (n: number) => String(n).padStart(2, "0");

function Label({ n, children, aside, dark }: { n?: string; children: ReactNode; aside?: ReactNode; dark?: boolean }) {
  return (
    <div className={`type-mono mb-[5vh] flex justify-between gap-4 ${dark ? "text-on-dark-muted" : "text-label"}`}>
      <span>
        {n ? <span className={dark ? "text-acc-on-dark" : "text-acc"}>{n}</span> : null} <span className={dark ? "text-on-dark" : "text-ink"}>{children}</span>
      </span>
      {aside ? <span>{aside}</span> : null}
    </div>
  );
}

function PreviewNote({ children }: { children: ReactNode }) {
  return <p className="preview-note">{children}</p>;
}

function media(ctx: Ctx, id: string | null, label: string, className?: string) {
  const m = id ? ctx.media.get(id) : undefined;
  return { m, missing: !m && ctx.preview ? <MissingMedia label={label} className={className} /> : null };
}

function render(block: Block, ctx: Ctx, key: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const d = block.data as BlockData<"heading">;
      if (!d.text) return null;
      return (
        <section key={key} className="cs-section">
          {d.eyebrow ? <p className="type-mono mb-4 text-label">{d.eyebrow}</p> : null}
          <h2 className="cs-h2 max-w-[18ch]">{d.text}</h2>
        </section>
      );
    }
    case "richText": {
      const d = block.data as BlockData<"richText">;
      if (!d.lead && !d.label) return null;
      return (
        <section key={key} className="cs-narrative">
          <div className="type-mono flex items-baseline gap-4">
            <span className="text-acc">{ctx.number()}</span>
            <span>{d.label}</span>
          </div>
          <div data-in="" className="cs-narrative-body reveal-up">
            {d.lead ? <p className="cs-lead">{d.lead}</p> : null}
            <RichText doc={d.body} className="cs-body" />
          </div>
        </section>
      );
    }
    case "fullWidthImage": {
      const d = block.data as BlockData<"fullWidthImage">;
      const { m, missing } = media(ctx, d.mediaId, "Full-width image", "aspect-[16/9]");
      if (!m) return missing ? <div key={key} className="cs-bleed-pad">{missing}</div> : null;
      return (
        <figure key={key} className="cs-figure cs-bleed-pad">
          <div className="relative overflow-hidden">
            <Picture media={m} sizes="100vw" imgClassName="w-full" />
            {d.annotations.length ? (
              <div className="cs-annotations" aria-hidden="true">
                {d.annotations.map((a) => (
                  <span key={a}>{a}</span>
                ))}
              </div>
            ) : null}
          </div>
          {d.caption ? <figcaption className="type-mono mt-3 text-label">{d.caption}</figcaption> : null}
        </figure>
      );
    }
    case "containedImage": {
      const d = block.data as BlockData<"containedImage">;
      const { m, missing } = media(ctx, d.mediaId, "Contained image", "aspect-[4/3]");
      if (!m) return missing ? <div key={key} className="cs-section">{missing}</div> : null;
      return (
        <figure key={key} className="cs-section cs-figure">
          <Picture media={m} sizes="(min-width: 1200px) 1100px, 100vw" imgClassName="mx-auto w-full max-w-[1100px]" />
          {d.caption ? <figcaption className="type-mono mx-auto mt-3 max-w-[1100px] text-label">{d.caption}</figcaption> : null}
        </figure>
      );
    }
    case "twoColumn": {
      const d = block.data as BlockData<"twoColumn">;
      return (
        <section key={key} className="cs-section cs-two-col">
          <RichText doc={d.left} className="cs-body" />
          <RichText doc={d.right} className="cs-body" />
        </section>
      );
    }
    case "imageText": {
      const d = block.data as BlockData<"imageText">;
      const { m, missing } = media(ctx, d.mediaId, "Image", "aspect-[4/3]");
      return (
        <section key={key} className="cs-section cs-image-text" data-side={d.side}>
          {m ? <Picture media={m} sizes="(min-width: 900px) 50vw, 100vw" imgClassName="w-full" /> : missing}
          <RichText doc={d.body} className="cs-body" />
        </section>
      );
    }
    case "video": {
      const d = block.data as BlockData<"video">;
      const video = d.mediaId ? ctx.media.get(d.mediaId) : undefined;
      if (!video) return ctx.preview ? <div key={key} className="cs-bleed-pad"><MissingMedia label="Video" className="aspect-video" /></div> : null;
      const poster = d.posterId ? ctx.media.get(d.posterId)?.largest ?? undefined : undefined;
      return (
        <section key={key} className="cs-bleed-pad">
          <VideoBlock src={video.url} poster={poster} autoplay={d.autoplay} label={video.alt || video.filename} />
        </section>
      );
    }
    case "gallery": {
      const d = block.data as BlockData<"gallery">;
      const items = d.mediaIds.map((id) => ctx.media.get(id)).filter((m): m is MediaView => Boolean(m));
      if (!items.length) return ctx.preview ? <div key={key} className="cs-section"><MissingMedia label="Gallery · no images" className="aspect-[3/1]" /></div> : null;
      return (
        <section key={key} className="cs-section">
          <ul className="cs-gallery">
            {items.map((m) => (
              <li key={m.id}>
                <Picture media={m} sizes="(min-width: 900px) 33vw, 100vw" imgClassName="aspect-[4/3] w-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "deviceMockup": {
      const d = block.data as BlockData<"deviceMockup">;
      if (!d.screens.length) return null;
      return (
        <section key={key} className="cs-section">
          <Label n={ctx.number()} aside={`Mobile / ${d.screens.length} key screen${d.screens.length === 1 ? "" : "s"}`}>
            Experience design
          </Label>
          <ul className="cs-phones">
            {d.screens.map((s, i) => {
              const m = s.mediaId ? ctx.media.get(s.mediaId) : undefined;
              return (
                <li key={i} data-prog="" className="cs-phone" style={{ "--drift": `${[6, -10, 4, -6, 8][i % 5]}vh` } as React.CSSProperties}>
                  <div className="cs-phone-screen">
                    {m ? <Picture media={m} sizes="200px" imgClassName="size-full object-cover" /> : <span className="type-mono text-[9px]">{s.label || "Screen"}</span>}
                  </div>
                  {s.label ? <span className="type-mono mt-2 block text-center text-label">{s.label}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      );
    }
    case "quote": {
      const d = block.data as BlockData<"quote">;
      const attributed = Boolean(d.quote && d.name);
      if (!attributed && !ctx.preview) return null;
      return (
        <section key={key} data-dark="" className="cs-dark">
          {!attributed ? <PreviewNote>Hidden on the live site: quotes need a name before they show.</PreviewNote> : null}
          <figure className="m-0 max-w-[1000px]">
            <blockquote className="cs-quote">“{d.quote || "Quote text"}”</blockquote>
            <figcaption className="type-mono mt-6 text-on-dark-muted">
              {d.name || "[Name]"}
              {d.role ? ` · ${d.role}` : ""}
            </figcaption>
          </figure>
        </section>
      );
    }
    case "statistic": {
      const d = block.data as BlockData<"statistic">;
      const items = d.items.filter((i) => i.value && i.label);
      if (!items.length || (!d.verified && !ctx.preview)) return null;
      return (
        <section key={key} data-dark="" className="cs-dark">
          <Label n={ctx.number()} dark>
            Outcomes
          </Label>
          {!d.verified ? <PreviewNote>Hidden on the live site: these figures aren&rsquo;t marked as verified.</PreviewNote> : null}
          <dl className="cs-stats">
            {items.map((item) => (
              <div key={item.label}>
                <dt className="type-mono order-2">{item.label}</dt>
                <dd className="cs-stat-value">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    }
    case "beforeAfter": {
      const d = block.data as BlockData<"beforeAfter">;
      const before = d.beforeId ? ctx.media.get(d.beforeId) : undefined;
      const after = d.afterId ? ctx.media.get(d.afterId) : undefined;
      if (!before || !after) return ctx.preview ? <div key={key} className="cs-section"><MissingMedia label="Before / after · needs two images" className="aspect-[2/1]" /></div> : null;
      return (
        <section key={key} className="cs-section">
          <div className="type-mono mb-5 flex justify-between border-b border-ink pb-3.5 text-label">
            <span>
              <span className="text-acc">{ctx.number()}</span> <span className="text-ink">Before / after</span>
            </span>
            <span>Drag or use arrow keys</span>
          </div>
          <BeforeAfter before={before} after={after} beforeLabel={d.beforeLabel || "Before"} afterLabel={d.afterLabel || "After"} />
        </section>
      );
    }
    case "technologyList": {
      const d = block.data as BlockData<"technologyList">;
      const items = d.items.filter((i) => i.name);
      if (!items.length) return null;
      return (
        <section key={key} className="cs-section">
          <ListHead n={ctx.number()}>Technology</ListHead>
          <ul className="cs-list">
            {items.map((i) => (
              <li key={i.name}>
                <span>{i.name}</span>
                <span className="type-mono text-[10px] text-label">{i.role}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "servicesList": {
      const d = block.data as BlockData<"servicesList">;
      const items = d.serviceIds.map((id) => ctx.services.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
      if (!items.length) return null;
      return (
        <section key={key} className="cs-section">
          <ListHead n={ctx.number()}>Services</ListHead>
          <ul className="cs-list">
            {items.map((s) => (
              <li key={s.slug}>
                {s.status === "PUBLISHED" ? (
                  <Link href={`/services/${s.slug}`} className="flex w-full justify-between hover:text-acc">
                    <span>{s.name}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                ) : (
                  <span>{s.name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "architecture": {
      const d = block.data as BlockData<"architecture">;
      if (!d.layers.length) return null;
      return (
        <section key={key} data-dark="" className="cs-dark">
          <Label n={ctx.number()} dark aside={`Architecture / ${d.layers.length} layers`}>
            Engineering
          </Label>
          <h2 className="cs-h2 mb-[8vh] max-w-[16ch]">{d.heading || "The system behind the interface."}</h2>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Architecture layers">
            <ol className="cs-arch" style={{ gridTemplateColumns: `repeat(${d.layers.length}, minmax(180px, 1fr))` }}>
              {d.layers.map((layer, i) => (
                <li key={i}>
                  <span className="type-mono flex justify-between text-[10px] text-on-dark-muted">
                    <span>
                      {pad(i + 1)} / {layer.layer}
                    </span>
                    <span className="text-acc-on-dark" aria-hidden="true">
                      →
                    </span>
                  </span>
                  <span className="text-[24px] font-semibold tracking-[-0.03em]">{layer.tech}</span>
                  <ul className="mt-auto flex list-none flex-col gap-1.5 p-0">
                    {layer.parts.map((p) => (
                      <li key={p} className="cs-arch-part">
                        {p}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
          {d.note ? <p className="mt-6 mb-0 max-w-[620px] text-[16px] leading-[1.55] text-on-dark-body">{d.note}</p> : null}
        </section>
      );
    }
    case "fullScreenMedia": {
      const d = block.data as BlockData<"fullScreenMedia">;
      const { m, missing } = media(ctx, d.mediaId, "Full-bleed media", "h-[70vh]");
      if (!m) return missing;
      return <Picture key={key} media={m} sizes="100vw" className="block" imgClassName="h-[min(100vh,1100px)] w-full object-cover" />;
    }
    case "cta": {
      const d = block.data as BlockData<"cta">;
      const href = safeHref(d.href) ?? "/contact";
      if (!d.heading) return null;
      return (
        <section key={key} className="cs-section flex flex-col items-start gap-8">
          <h2 className="cs-h2 max-w-[16ch]">{d.heading}</h2>
          <Link href={href} data-mag="" data-cursor="OPEN ↗" className="btn-accent type-mono-12">
            {d.label || "Start a project ↗"}
          </Link>
        </section>
      );
    }
    case "spacer": {
      const d = block.data as BlockData<"spacer">;
      return <div key={key} aria-hidden="true" style={{ height: { S: "4vh", M: "8vh", L: "16vh" }[d.size] }} />;
    }
  }
}

function ListHead({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h2 className="type-mono m-0 border-b border-ink pb-3 font-normal">
      <span className="text-acc">{n}</span> {children}
    </h2>
  );
}

export function CaseStudyBlocks({ blocks, ...rest }: { blocks: Block[] } & Omit<Ctx, "number"> & { startAt?: number }) {
  let n = (rest.startAt ?? 1) - 1;
  const ctx: Ctx = { ...rest, number: () => pad(++n) };
  return <>{blocks.map((block, i) => render(block, ctx, i))}</>;
}

export function countNumbered(blocks: Block[], ctx: Omit<Ctx, "number">) {
  // Mirrors render(): lets trailing auto sections continue the numbering.
  let n = 0;
  const probe: Ctx = { ...ctx, number: () => pad(++n) };
  blocks.forEach((b, i) => render(b, probe, i));
  return n;
}
