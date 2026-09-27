"use client";

import { useRef, useState } from "react";
import { outcomes, pad } from "@/lib/home-content";

export function OutcomesSection() {
  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number, focus = false) => {
    const next = (index + outcomes.length) % outcomes.length;
    setActive(next);
    if (focus) tabsRef.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowRight: active + 1,
      ArrowUp: active - 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: outcomes.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    select(keys[event.key], true);
  };

  const current = outcomes[active];

  return (
    <section className="plate-full plate-dark" data-dark="" data-sculpt="none" aria-labelledby="outcomes-title">
      <div className="type-mono mb-[5vh] flex justify-between text-on-dark-muted">
        <span>Plate 04 / Outcomes</span>
        <span>Select a problem</span>
      </div>
      <h2 id="outcomes-title" className="type-display mb-[8vh] max-w-[14ch] text-[clamp(48px,8vw,150px)]">
        Technology should solve something<span className="text-acc-on-dark">.</span>
      </h2>
      <div className="grid items-start gap-x-[6vw] gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <div
          role="tablist"
          aria-label="Problems"
          aria-orientation="vertical"
          className="flex flex-col border-t border-[rgba(238,237,232,0.2)]"
          onKeyDown={onKeyDown}
        >
          {outcomes.map((item, index) => {
            const on = index === active;
            return (
              <button
                key={item.problem}
                ref={(node) => {
                  tabsRef.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`outcome-tab-${index}`}
                aria-selected={on}
                aria-controls="outcome-panel"
                tabIndex={on ? 0 : -1}
                data-active={on || undefined}
                className="outcome-tab"
                onClick={() => select(index)}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") select(index);
                }}
              >
                <span className="font-mono text-[11px]">{pad(index + 1)}</span>
                <span className="text-[clamp(20px,1.8vw,28px)] font-medium tracking-[-0.025em]">{item.problem}</span>
                <span className="font-mono" aria-hidden="true">
                  {on ? "→" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id="outcome-panel"
          aria-labelledby={`outcome-tab-${active}`}
          className="outcome-panel"
        >
          <span className="type-mono text-acc-on-dark">Outcome / {pad(active + 1)}</span>
          <p className="m-0 text-[clamp(28px,3.2vw,54px)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">
            {current.outcome}
          </p>
          <div className="type-mono mt-auto flex flex-col gap-[6px] text-on-dark-muted">
            <span>Typical work</span>
            <span className="text-on-dark">{current.work}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
