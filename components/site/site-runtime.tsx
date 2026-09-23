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
    const fine = window.matchMedia("(pointer: fine)").matches && !reduced;
    const root = document.documentElement;
    const pointer = { x: -100, y: -100, rx: -100, ry: -100 };
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

    if (fine && cursor) {
      root.classList.add("cc");
      cursor.style.display = "block";
    }

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!fine || !ringRef.current || !dotRef.current) return;
      pointer.rx += (pointer.x - pointer.rx) * 0.2;
      pointer.ry += (pointer.y - pointer.ry) * 0.2;
      if (ringRef.current.parentElement) {
        ringRef.current.parentElement.style.transform = `translate(${pointer.rx}px, ${pointer.ry}px)`;
      }
      dotRef.current.style.transform = `translate(${pointer.x - pointer.rx}px, ${pointer.y - pointer.ry}px)`;
    };
    tick();

    const onMove = (event: PointerEvent) => {
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

    const onOver = (event: Event) => {
      if (!fine || !ringRef.current || !labelRef.current || !dotRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const marked = target.closest("[data-cursor]");
      const interactive = target.closest("a, button, input, textarea, label");
      const dark = target.closest("[data-dark]");
      const label = marked?.getAttribute("data-cursor") ?? "";
      let size = 30;
      let background = "transparent";
      let border = dark ? "rgba(238,237,232,.6)" : "rgba(17,17,16,.5)";
      let text = "";
      if (label) {
        size = 80;
        background = "var(--acc)";
        border = "transparent";
        text = label;
      } else if (interactive) {
        size = 48;
      }
      const ring = ringRef.current;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      ring.style.backgroundColor = background;
      ring.style.borderColor = border;
      labelRef.current.textContent = text;
      labelRef.current.style.opacity = text ? "1" : "0";
      dotRef.current.style.background = dark ? "#EEEDE8" : "#111110";
    };

    const onScroll = () => {
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
    document.addEventListener("pointerover", onOver);
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
      document.removeEventListener("pointerover", onOver);
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
