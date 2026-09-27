import { AboutSection } from "@/components/home/about-section";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import { HeroSection } from "@/components/home/hero-section";
import { IndustriesSection } from "@/components/home/industries-section";
import { OutcomesSection } from "@/components/home/outcomes-section";
import { PositioningSection } from "@/components/home/positioning-section";
import { SpecimenFrame } from "@/components/home/specimen-frame";
import { WhatWeBuildSection } from "@/components/home/what-we-build-section";

export default function HomePage() {
  return (
    <>
      <SpecimenFrame />
      <main className="relative z-[2]">
        <HeroSection />
        <PositioningSection />
        <WhatWeBuildSection />
        <OutcomesSection />
        <IndustriesSection />
        <AboutSection />
        <FinalCtaSection />
      </main>
    </>
  );
}
