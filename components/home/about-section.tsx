import { FounderPortrait } from "@/components/home/founder-portrait";
import { companyName } from "@/lib/brand";
import { accessibilityAcross, founderExpertise, securityPractice } from "@/lib/home-content";

export function AboutSection() {
  return (
    <section
      id="about"
      className="plate-full plate-dark"
      data-dark=""
      data-sculpt="none"
      aria-labelledby="about-title"
    >
      <div className="type-mono mb-[5vh] flex justify-between text-on-dark-muted">
        <span>Plate 13 / About</span>
        <span>Team / 01 · Independent</span>
      </div>
      <h2 id="about-title" className="type-display mb-[8vh] text-[clamp(46px,7.6vw,140px)] tracking-[-0.07em]">
        Small by design.
        <br />
        Serious about the work<span className="text-acc-on-dark">.</span>
      </h2>
      <div className="grid gap-x-[5vw] gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <FounderPortrait />

        <div className="flex flex-col gap-6">
          <p className="m-0 text-[clamp(20px,1.7vw,26px)] leading-[1.35] tracking-[-0.015em]">
            {companyName} is an independent digital engineering company built around quality, clarity and thoughtful
            technology.
          </p>
          <p className="m-0 text-[16px] leading-[1.55] text-on-dark-body">
            We combine product thinking, experience design and software engineering to create digital systems designed
            for real organisations and real users.
          </p>
          <div className="mt-auto border-t border-[rgba(238,237,232,0.25)] pt-4">
            <span className="type-mono block text-on-dark-muted">01 / Founder &amp; Software Engineer</span>
            <span className="mt-[6px] block text-[28px] font-semibold tracking-[-0.035em]">[Founder name]</span>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-[6px] p-0" aria-label="Expertise">
              {founderExpertise.map((item) => (
                <li key={item} className="chip-dark">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-7">
          <div>
            <h3 className="m-0 mb-[10px] text-[clamp(28px,2.6vw,42px)] leading-[0.95] font-bold tracking-[-0.05em] uppercase">
              Built for the real world.
            </h3>
            <p className="m-0 text-[15px] leading-[1.5] text-on-dark-body">
              Thoughtful architecture. Structured testing. Accessible experiences. Maintainable technology.
            </p>
          </div>
          <div>
            <h3 className="trust-label type-mono">Security practice</h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-4 p-0">
              {securityPractice.map((item) => (
                <li key={item} className="border-b border-[rgba(238,237,232,0.1)] py-[9px] text-[14px]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="trust-label type-mono">Accessibility across</h3>
            <ul className="type-mono m-0 flex list-none flex-wrap gap-x-[10px] gap-y-[6px] p-0 pt-3 tracking-[0.06em]">
              {accessibilityAcross.map((item) => (
                <li key={item}>
                  {item} <span className="text-on-dark-muted" aria-hidden="true">→</span>
                </li>
              ))}
            </ul>
            <p className="type-mono m-0 mt-[14px] text-[10px] leading-[1.6] tracking-[0.06em] text-on-dark-muted">
              No certifications claimed. WCAG referenced per project only where verified.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
