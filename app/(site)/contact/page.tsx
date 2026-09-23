import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="page-shell">
      <p className="type-mono mb-8 text-label">Start a project</p>
      <h1 className="type-page">
        Tell us about your challenge<span className="text-acc">.</span>
      </h1>
    </main>
  );
}
