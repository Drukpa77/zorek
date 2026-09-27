"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { capabilities, pad } from "@/lib/home-content";

export function WhatWeBuildSection() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // Scrolling a row through the viewport centre activates it, so touch users
  // still see the specimen change.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = window.innerHeight / 2;
        list.querySelectorAll<HTMLElement>("[data-cap]").forEach((row, index) => {
          const rect = row.getBoundingClientRect();
          if (rect.top <= mid && rect.bottom >= mid) setActive(index);
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const current = capabilities[active];

  return (
    <section
      id="capabilities"
      className="plate"
      data-sculpt={current.mode}
      data-plate="03"
      data-note={`Capability / ${pad(active + 1)}`}
      aria-labelledby="build-title"
    >
      <div className="type-mono mb-[5vh] flex justify-between text-label">
        <span>Plate 03 / What we build</span>
        <span>{pad(capabilities.length)} capabilities</span>
      </div>
      <h2 id="build-title" className="type-section mb-[3vh]">
        What we build
      </h2>
      <Link
        href="/services/custom-software"
        data-cursor="OPEN ↗"
        className="type-mono site-link mb-[6vh] inline-flex border-b border-ink pb-1"
      >
        Example service page / Custom software ↗
      </Link>
      <div className="border-t border-ink">
        <div className="spec-row type-mono py-[10px] text-[10px] text-faint" aria-hidden="true">
          <span>No.</span>
          <span>Capability</span>
          <span>Scope</span>
        </div>
        <ol ref={listRef} className="m-0 list-none p-0">
          {capabilities.map((capability, index) => {
            const on = index === active;
            return (
              <li
                key={capability.title}
                data-cap=""
                data-active={on || undefined}
                data-cursor="EXPLORE"
                className="spec-row capability-row"
                onPointerEnter={() => setActive(index)}
              >
                <span className="font-mono text-[11px]" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <h3 className="m-0 text-[clamp(22px,2.2vw,34px)] leading-[1.05] font-semibold tracking-[-0.035em]">
                  {capability.title}
                </h3>
                <p className="m-0 text-[15px] leading-[1.5]">{capability.scope}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
