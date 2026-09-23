import type { Metadata } from "next";

export const metadata: Metadata = { title: "Industries" };

export default function IndustriesPage() {
  return (
    <main className="page-shell">
      <h1 className="type-page">
        Where the work applies<span className="text-acc">.</span>
      </h1>
    </main>
  );
}
