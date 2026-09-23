import type { Metadata } from "next";
import { notFound } from "next/navigation";

const services: Record<string, { title: string; lines: [string, string, string] }> = {
  "custom-software": {
    title: "Custom software",
    lines: ["Software", "built around", "your business."],
  },
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(services).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = services[slug];
  if (!service) return { title: "Service" };
  return { title: service.title };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = services[slug];
  if (!service) notFound();

  return (
    <main className="page-shell">
      <p className="type-mono mb-8 text-label">Services / {service.title}</p>
      <h1 className="type-page">
        <span className="block">{service.lines[0]}</span>
        <span className="block text-faint">{service.lines[1]}</span>
        <span className="block text-acc">{service.lines[2]}</span>
      </h1>
    </main>
  );
}
