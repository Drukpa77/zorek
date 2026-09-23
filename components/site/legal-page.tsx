import type { Metadata } from "next";

const pages = {
  privacy: "Privacy",
  terms: "Terms",
  accessibility: "Accessibility",
} as const;

export function legalMetadata(key: keyof typeof pages): Metadata {
  return { title: pages[key] };
}

export function LegalPage({ title }: { title: string }) {
  return (
    <main className="page-shell">
      <p className="type-mono mb-[3vh] text-label">Legal</p>
      <h1 className="type-page">
        {title}
        <span className="text-acc">.</span>
      </h1>
    </main>
  );
}
