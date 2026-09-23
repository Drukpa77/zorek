import Link from "next/link";
import { SydneyClock } from "@/components/site/sydney-clock";
import { WordCycler } from "@/components/site/word-cycler";

export function HeroSection() {
  return (
    <section
      className="hero"
      data-sculpt="fragment"
      data-plate="01"
      data-note="State / unresolved"
      aria-labelledby="hero-title"
    >
      <div className="type-mono flex flex-wrap gap-x-8 gap-y-2 text-label">
        <span>Plate 01 / Introduction</span>
        <span>Digital Product &amp; Software Engineering</span>
        <SydneyClock />
      </div>
      <div>
        <p className="sr-only">Design. Engineer. Evolve.</p>
        <WordCycler />
        <h1 id="hero-title" className="hero-title reveal-blur" data-in="">
          Technology built around your business.
        </h1>
      </div>
      <div className="hero-bar">
        <p className="m-0 max-w-[440px] text-[16px] leading-[1.5] text-pretty text-muted">
          We design and engineer digital platforms, software and experiences that help organisations
          operate better, serve customers better and grow.
        </p>
        <div className="flex flex-wrap gap-[10px]">
          <Link href="/contact" data-mag="" data-cursor="OPEN ↗" className="btn-accent type-mono-12">
            Start a project ↗
          </Link>
          <Link href="/work" data-mag="" data-cursor="" className="btn-outline type-mono-12">
            Explore our work
          </Link>
        </div>
        <span className="type-mono text-label">Scroll to explore ↓</span>
      </div>
    </section>
  );
}
