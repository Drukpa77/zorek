import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-a-bg text-ink">{children}</div>;
}
