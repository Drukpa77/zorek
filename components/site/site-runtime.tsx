"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { companyName } from "@/lib/brand";

const EASE_OUT = "cubic-bezier(.19,1,.22,1)";
const EASE_WIPE = "cubic-bezier(.77,0,.18,1)";
const BOOT_SEQUENCE = [0, 18, 37, 61, 84, 100] as const;
const BOOT_ROWS = [
  ["00 · System", "Initialising"],
  ["18 · Strategy", "Loaded"],
  ["37 · Design", "Loaded"],
  ["61 · Engineering", "Loaded"],
  ["84 · Quality", "Verified"],
  ["100 · Ready", "●"],
] as const;

// Decides cursor colour from what is actually painted under the pointer, so
// every dark surface (plates, hover fills, selected chips, buttons) works
// without being tagged. Walks up to the first mostly-opaque background.
function isDarkBehind(element: Element) {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const match = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (!match) continue;
    const [r, g, b, a = 1] = match.map(Number);
    if (a < 0.5) continue;
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    return luminance < 0.25;
  }
  return false;
}

export function SiteRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  const grainRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const wipeLabelRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const cursor = cursorRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const pointer = { x: -100, y: -100, rx: -100, ry: -100 };
    // The custom cursor follows the live input, not the input at page load:
    // switching to touch (a phone, a tablet, DevTools device mode) restores the
    // native cursor straight away.
    let fine = false;
    let usingMouse = true;
    let inside = true;
    let dirty = true;
    let frame = 0;
    let bootFrame = 0;
    let hideTimer = 0;
    let slideTimer = 0;
    let safetyTimer = 0;
    let navTimer = 0;
    let navigating = false;
    let observing = false;

    const grain = grainRef.current;
    if (grain) {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const context = canvas.getContext("2d");
      if (context) {
        const image = context.createImageData(160, 160);
        for (let i = 0; i < image.data.length; i += 4) {
          const value = Math.random() * 255;
          image.data[i] = value;
          image.data[i + 1] = value;
          image.data[i + 2] = value;
          image.data[i + 3] = 255;
        }
        context.putImageData(image, 0, 0);
        grain.style.backgroundImage = `url(${canvas.toDataURL()})`;
      }
    }

    const syncCursor = () => {
      fine = finePointer.matches && !reducedMotion.matches && usingMouse;
      root.classList.toggle("cc", fine);
      if (cursor) cursor.style.display = fine && inside ? "block" : "none";
      if (!fine) {
        document.querySelectorAll<HTMLElement>("[data-mag]").forEach((element) => {
          element.style.transform = "";
        });
      }
      dirty = true;
    };
    syncCursor();
    finePointer.addEventListener("change", syncCursor);
    reducedMotion.addEventListener("change", syncCursor);

    // Styles the cursor for whatever is under it. Runs from the frame loop
    // whenever something may have changed underneath a still pointer: a scroll,
    // a click that opens the menu, a route change.
    const paintCursor = () => {
      if (!fine || !ringRef.current || !labelRef.current || !dotRef.current) return;
      const target = document.elementFromPoint(pointer.x, pointer.y);
      const marked = target?.closest("[data-cursor]");
      const interactive = target?.closest("a, button, input, textarea, label, select");
      const dark = target ? isDarkBehind(target) : false;
      const label = marked?.getAttribute("data-cursor") ?? "";
      let size = 30;
      let background = "transparent";
      let border = dark ? "rgba(238,237,232,.6)" : "rgba(17,17,16,.5)";
      if (label) {
        size = 80;
        background = "var(--acc)";
        border = "transparent";
      } else if (interactive) {
        size = 48;
      }
      const ring = ringRef.current;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      ring.style.backgroundColor = background;
      ring.style.borderColor = border;
      labelRef.current.textContent = label;
      labelRef.current.style.opacity = label ? "1" : "0";
      dotRef.current.style.background = dark ? "#EEEDE8" : "#111110";
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!fine || !ringRef.current || !dotRef.current) return;
      if (dirty) {
        dirty = false;
        paintCursor();
      }
      pointer.rx += (pointer.x - pointer.rx) * 0.2;
      pointer.ry += (pointer.y - pointer.ry) * 0.2;
      if (ringRef.current.parentElement) {
        ringRef.current.parentElement.style.transform = `translate(${pointer.rx}px, ${pointer.ry}px)`;
      }
      dotRef.current.style.transform = `translate(${pointer.x - pointer.rx}px, ${pointer.y - pointer.ry}px)`;
    };
    tick();

    const onMove = (event: PointerEvent) => {
      const mouse = event.pointerType === "mouse";
      if (mouse !== usingMouse) {
        usingMouse = mouse;
        syncCursor();
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!fine) return;
      document.querySelectorAll<HTMLElement>("[data-mag]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const near = Math.abs(dx) < rect.width / 2 + 36 && Math.abs(dy) < rect.height / 2 + 26;
        element.style.transition = `transform .5s ${EASE_OUT}, background-color .3s, color .3s`;
        element.style.transform = near ? `translate(${dx * 0.2}px, ${dy * 0.28}px)` : "";
      });
    };

    const markDirty = () => {
      dirty = true;
    };

    // Hover fills (e.g. outline buttons turning charcoal) animate in, so look
    // again once they finish.
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === "background-color") dirty = true;
    };

    // Clicks can swap what's under a still pointer (menu opens, step changes).
    const onPointerUp = () => {
      requestAnimationFrame(markDirty);
    };

    const onLeave = () => {
      inside = false;
      if (cursor) cursor.style.display = "none";
    };

    const onEnter = () => {
      inside = true;
      syncCursor();
    };

    const onScroll = () => {
      dirty = true;
      const nav = document.querySelector<HTMLElement>("[data-nav]");
      if (nav) nav.style.setProperty("--c", window.scrollY > 40 ? "1" : "0");
      const viewport = window.innerHeight;
      const max = Math.max(1, root.scrollHeight - viewport);
      root.style.setProperty("--sp", (window.scrollY / max).toFixed(4));
      document.querySelectorAll<HTMLElement>("[data-prog]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -viewport || rect.top > viewport * 2) return;
        const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (rect.height + viewport)));
        element.style.setProperty("--p", progress.toFixed(4));
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).style.setProperty("--in", "1");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );

    const scan = () => {
      const viewport = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-in]:not([data-seen])").forEach((element) => {
        element.setAttribute("data-seen", "");
        const rect = element.getBoundingClientRect();
        if (reduced || (rect.top < viewport && rect.bottom > 0)) {
          requestAnimationFrame(() => element.style.setProperty("--in", "1"));
        } else {
          observer.observe(element);
        }
      });
    };

    const startObserving = () => {
      if (observing) return;
      observing = true;
      scan();
      safetyTimer = window.setTimeout(() => {
        document.querySelectorAll<HTMLElement>("[data-in]").forEach((element) => {
          if (element.getBoundingClientRect().top < window.innerHeight) {
            element.style.setProperty("--in", "1");
          }
        });
      }, 1500);
    };

    const mutations = new MutationObserver(() => {
      dirty = true;
      if (observing) scan();
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const loader = loaderRef.current;
    let seen = false;
    try {
      seen = window.localStorage.getItem("cn_boot_b1") === "1";
    } catch {
      seen = false;
    }

    if (reduced || seen || !loader || !countRef.current) {
      if (loader) loader.style.display = "none";
      startObserving();
    } else {
      const count = countRef.current;
      const rows = [...loader.querySelectorAll<HTMLElement>("[data-stage]")];
      loader.style.display = "flex";
      root.style.overflow = "hidden";
      const started = performance.now();
      const step = () => {
        const progress = Math.min(1, (performance.now() - started) / 2800);
        const index = Math.min(BOOT_SEQUENCE.length - 1, Math.floor(progress * 5.999));
        count.textContent = String(BOOT_SEQUENCE[index]).padStart(2, "0");
        rows.forEach((row, rowIndex) => {
          row.style.opacity = rowIndex <= index ? "1" : "0.2";
        });
        if (progress < 1) {
          bootFrame = requestAnimationFrame(step);
          return;
        }
        try {
          window.localStorage.setItem("cn_boot_b1", "1");
        } catch {
          /* storage can be unavailable */
        }
        slideTimer = window.setTimeout(() => {
          loader.style.transform = "translateY(-100%)";
          root.style.overflow = "";
          hideTimer = window.setTimeout(() => {
            loader.style.display = "none";
          }, 1150);
          startObserving();
        }, 400);
      };
      bootFrame = requestAnimationFrame(step);
    }

    const onClick = (event: MouseEvent) => {
      if (reduced || navigating || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      navigating = true;
      window.dispatchEvent(new Event("site-navigate"));

      const label =
        (anchor.getAttribute("aria-label") || anchor.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48) ||
        "Loading";
      try {
        window.sessionStorage.setItem("cn_wipe", label);
      } catch {
        /* storage can be unavailable */
      }

      const wipe = wipeRef.current;
      const wipeLabel = wipeLabelRef.current;
      if (wipe && wipeLabel) {
        wipeLabel.textContent = label;
        wipe.style.transformOrigin = "bottom";
        wipe.style.transition = `transform .6s ${EASE_WIPE}`;
        wipe.style.transform = "scaleY(1)";
      }

      navTimer = window.setTimeout(() => {
        routerRef.current.push(`${url.pathname}${url.search}${url.hash}`);
        navigating = false;
      }, 620);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", markDirty);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("transitionend", onTransitionEnd);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("mouseenter", onEnter);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    onScroll();

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(bootFrame);
      window.clearTimeout(hideTimer);
      window.clearTimeout(slideTimer);
      window.clearTimeout(safetyTimer);
      window.clearTimeout(navTimer);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", markDirty);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("transitionend", onTransitionEnd);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("mouseenter", onEnter);
      finePointer.removeEventListener("change", syncCursor);
      reducedMotion.removeEventListener("change", syncCursor);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      root.classList.remove("cc");
      root.style.overflow = "";
      if (cursor) cursor.style.display = "none";
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  useEffect(() => {
    const wipe = wipeRef.current;
    const wipeLabel = wipeLabelRef.current;
    if (!wipe || !wipeLabel) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flag: string | null = null;
    try {
      flag = window.sessionStorage.getItem("cn_wipe");
      window.sessionStorage.removeItem("cn_wipe");
    } catch {
      flag = null;
    }
    if (!flag || reduced) return;

    wipeLabel.textContent = flag;
    wipe.style.transition = "none";
    wipe.style.transformOrigin = "top";
    wipe.style.transform = "scaleY(1)";
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        wipe.style.transition = `transform .9s ${EASE_WIPE} .1s`;
        wipe.style.transform = "scaleY(0)";
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pathname]);

  return (
    <>
      <div ref={grainRef} className="grain" data-grain="" aria-hidden="true" />
      <div ref={loaderRef} className="boot-loader" data-loader="" aria-hidden="true">
        <div className="type-mono flex justify-between">
          <span>{companyName}</span>
          <span>Boot sequence</span>
        </div>
        <div className="grid items-end gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <div ref={countRef} className="boot-count" data-count="">
            00
          </div>
          <div className="boot-table">
            {BOOT_ROWS.map(([label, status], index) => (
              <div
                key={label}
                data-stage=""
                className="boot-row"
                style={index === BOOT_ROWS.length - 1 ? { color: "var(--acc)" } : undefined}
              >
                <span>{label}</span>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div ref={cursorRef} className="cursor" data-cursor-el="" aria-hidden="true">
        <div ref={ringRef} className="cursor-ring" data-cring="">
          <span ref={labelRef} className="cursor-label" data-clabel="" />
        </div>
        <div ref={dotRef} className="cursor-dot" data-cdot="" />
      </div>
      <div ref={wipeRef} className="page-wipe type-mono" data-wipe="" aria-hidden="true">
        <span ref={wipeLabelRef} data-wipe-label="">
          Loading
        </span>
        <span className="text-acc-on-dark">●</span>
      </div>
    </>
  );
}
