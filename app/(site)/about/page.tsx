import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="page-shell">
      <div id="approach" />
      <div id="trust" />
      <p className="type-mono mb-8 text-label">About</p>
      <h1 className="type-page">
        <span className="block">Small by design.</span>
        <span className="block text-faint">Serious about</span>
        <span className="block text-acc">the work.</span>
      </h1>
    </main>
  );
}
