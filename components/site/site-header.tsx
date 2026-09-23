"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/site/logo";
import { isCurrent, padIndex } from "@/lib/navigation";
import type { NavEntry } from "@/lib/site-data";

export function SiteHeader({ items }: { items: NavEntry[] }) {
  const menuItems = items.some((item) => item.key === "contact")
    ? items
    : [...items, { label: "Contact", href: "/contact", key: "contact" }];
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const indexRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("site-navigate", close);
    return () => window.removeEventListener("site-navigate", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        indexRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-[var(--pad-x)] focus:z-[100] focus:bg-ink focus:px-3 focus:py-2 focus:text-on-dark"
      >
        Skip to content
      </a>
      <header data-nav="" className="site-header">
        <Logo />
        <nav className="nav-desktop" aria-label="Main">
          {items.map((item, index) => {
            const current = isCurrent(item.key, pathname, hash);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={current ? "page" : undefined}
                data-cursor=""
                className="nav-link site-link"
              >
                <span className="text-faint">{padIndex(index + 1)}</span>
                {item.label}
              </Link>
            );
          })}
          <Link href="/contact" data-mag="" data-cursor="OPEN ↗" className="nav-cta type-mono">
            Start a project ↗
          </Link>
        </nav>
        <button
          ref={indexRef}
          type="button"
          className="nav-index"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls={titleId}
          onClick={() => setOpen(true)}
        >
          Index
          <span aria-hidden="true" className="grid grid-cols-[5px_5px] gap-[2px]">
            <span className="block size-[5px] bg-ink" />
            <span className="block size-[5px] bg-ink" />
            <span className="block size-[5px] bg-ink" />
            <span className="block size-[5px] bg-acc" />
          </span>
        </button>
      </header>
      {open ? (
        <div
          ref={dialogRef}
          id={titleId}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="index-menu"
        >
          <div className="type-mono flex h-16 items-center justify-between">
            <span>Index</span>
            <button
              ref={closeRef}
              type="button"
              className="h-11"
              onClick={() => {
                setOpen(false);
                indexRef.current?.focus();
              }}
            >
              Close ×
            </button>
          </div>
          <nav className="index-grid" aria-label="Mobile">
            {menuItems.map((item, index) => (
              <Link
                key={item.key}
                href={item.href}
                data-in=""
                className="menu-link"
                style={{ transitionDelay: `${0.05 + index * 0.05}s` }}
                onClick={() => setOpen(false)}
              >
                <span className="type-mono text-acc-on-dark">{padIndex(index + 1)}</span>
                <span className="text-[clamp(28px,8vw,44px)] font-semibold tracking-[-0.04em]">{item.label}</span>
              </Link>
            ))}
          </nav>
          <Link href="/contact" className="menu-cta type-mono-12" onClick={() => setOpen(false)}>
            Start a project <span>↗</span>
          </Link>
        </div>
      ) : null}
    </>
  );
}
