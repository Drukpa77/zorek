import Link from "next/link";
import { industries, pad } from "@/lib/home-content";

export function IndustriesSection() {
  return (
    <section className="plate-full border-t py-[14vh] border-[var(--rule)]" data-sculpt="none" aria-labelledby="industries-title">
      <div className="type-mono mb-[5vh] flex justify-between text-label">
        <span>Plate 12 / Industries</span>
        <span>Expandable index</span>
      </div>
      <div className="mb-[6vh] grid items-end gap-x-[5vw] gap-y-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
        <h2 id="industries-title" className="type-display text-[clamp(40px,5.6vw,100px)]">
          Where the work applies.
        </h2>
        <p className="m-0 max-w-[440px] text-[16px] leading-[1.5] text-muted">
          Sectors describe where our capabilities are relevant. Case studies are linked as projects are published.
        </p>
      </div>
      <ul className="m-0 list-none border-t border-ink p-0">
        {industries.map((industry, index) => (
          <li key={industry.title}>
            <Link href="/industries" data-cursor="OPEN ↗" className="industry-row">
              <span className="font-mono text-[11px] text-faint" aria-hidden="true">
                {pad(index + 1)}
              </span>
              <span className="text-[clamp(20px,1.9vw,28px)] font-semibold tracking-[-0.03em]">{industry.title}</span>
              <span className="text-[15px] leading-[1.5] text-muted">{industry.copy}</span>
              <span className="industry-studies type-mono text-[10px] tracking-[0.06em] text-label">Studies / —</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
