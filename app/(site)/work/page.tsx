import type { Metadata } from "next";

export const metadata: Metadata = { title: "Work" };

export default function WorkPage() {
  return (
    <main className="page-shell">
      <h1 className="type-mega border-b border-ink pb-[3vh]">Work</h1>
    </main>
  );
}
