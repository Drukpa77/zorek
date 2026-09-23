import { HeroSection } from "@/components/home/hero-section";
import { SpecimenFrame } from "@/components/home/specimen-frame";

export default function HomePage() {
  return (
    <>
      <SpecimenFrame />
      <main className="relative z-[2]">
        <HeroSection />
        <div id="capabilities" />
      </main>
    </>
  );
}
