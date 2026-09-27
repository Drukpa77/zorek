import { positioningCopy } from "@/lib/home-content";

const words = positioningCopy.split(" ");

export function PositioningSection() {
  return (
    <section
      className="plate py-[18vh]"
      data-prog=""
      data-sculpt="fragment"
      data-plate="02"
      data-note="State / resolving"
      aria-labelledby="positioning-title"
    >
      <span className="type-mono mb-[6vh] block text-label">Plate 02 / Positioning</span>
      <h2 id="positioning-title" className="type-display mb-[8vh]">
        We turn complex ideas into simple digital systems<span className="text-acc">.</span>
      </h2>
      <p className="positioning-copy">
        {words.map((word, index) => (
          <span key={index} style={{ "--f": (index / words.length).toFixed(3) } as React.CSSProperties}>
            {word}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
