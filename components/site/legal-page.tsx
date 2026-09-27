import type { Metadata } from "next";
import Link from "next/link";
import { legalDocument, legalDocuments, legalUpdated, type LegalKey } from "@/lib/legal";

export function legalMetadata(key: LegalKey): Metadata {
  const document = legalDocument(key);
  return {
    title: document.title,
    description: document.sections[0]?.body,
  };
}

export function LegalPage({ doc }: { doc: LegalKey }) {
  const document = legalDocument(doc);

  return (
    <main className="page-shell">
      <div className="type-mono mb-[3vh] flex flex-wrap justify-between gap-3 text-label">
        <span>Legal</span>
        <span>Last updated / {legalUpdated}</span>
      </div>
      <h1 className="type-page mb-[4vh]">
        {document.title}
        <span className="text-acc">.</span>
      </h1>
      <div role="tablist" aria-label="Legal documents" className="mb-[8vh] flex flex-wrap border-t border-l border-ink border-l-[var(--rule)]">
        {legalDocuments.map((item) => {
          const current = item.key === doc;
          return (
            <Link
              key={item.key}
              href={item.href}
              role="tab"
              aria-selected={current}
              className={`inline-flex min-h-12 items-center border-r border-b border-[var(--rule)] px-[18px] type-mono ${
                current ? "bg-ink text-on-dark" : "text-ink"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </div>
      <div className="grid items-start gap-10 lg:grid-cols-[240px_minmax(0,720px)]">
        <nav aria-label="Sections" className="flex flex-col gap-2.5 text-[14px] lg:sticky lg:top-[100px]">
          <span className="type-mono border-b border-ink pb-2 text-[10px] text-label">Sections</span>
          {document.sections.map((section, index) => (
            <a key={section.heading} href={`#section-${index + 1}`} className="site-link">
              {String(index + 1).padStart(2, "0")} · {section.heading}
            </a>
          ))}
        </nav>
        <div className="max-w-[720px] text-[17px] leading-[1.7] text-ink-2">
          {document.sections.map((section, index) => (
            <section key={section.heading} id={`section-${index + 1}`} className="border-t border-[var(--rule)] py-7">
              <h2 className="mb-3 text-[clamp(22px,2vw,30px)] font-semibold tracking-[-0.035em]">
                <span className="mr-3 font-mono text-[11px] text-acc">{String(index + 1).padStart(2, "0")}</span>
                {section.heading}
              </h2>
              <p className="m-0">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
