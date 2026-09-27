import Link from "next/link";

const WORDS = ["Have", "something", "worth", "building?"];

export function FinalCtaSection() {
  return (
    <section
      id="start"
      className="plate cta-plate"
      data-sculpt="sphere"
      data-plate="15"
      data-note="State / complete"
      aria-labelledby="cta-title"
    >
      <span className="type-mono mb-[5vh] text-label">Plate 15 / Start</span>
      <h2 id="cta-title" className="type-cta">
        {WORDS.map((word, index) => (
          <span key={word} data-in="" className="mask-line">
            <span
              className={index === WORDS.length - 1 ? "text-acc" : undefined}
              style={{ transitionDelay: `${index * 0.09}s` }}
            >
              {word}
            </span>{" "}
          </span>
        ))}
      </h2>
      <div className="mt-[8vh] grid items-end gap-x-10 gap-y-6 border-t border-ink pt-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        <p className="m-0 max-w-[380px] text-[18px] leading-[1.45] text-muted">
          Tell us what you&rsquo;re trying to achieve. We&rsquo;ll help determine the right way forward.
        </p>
        <div className="flex flex-col items-start gap-[14px]">
          <Link href="/contact" data-mag="" data-cursor="OPEN ↗" className="btn-accent btn-lg type-mono-12">
            Start a conversation ↗
          </Link>
          <a href="mailto:hello@example.com" className="site-link font-mono text-[13px]">
            hello@[domain].com
          </a>
        </div>
      </div>
    </section>
  );
}
