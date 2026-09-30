"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { type SearchHit, searchAdmin } from "@/app/admin/actions";
import type { AdminKey } from "@/lib/admin-nav";

export type FrameNavItem = {
  key: AdminKey;
  label: string;
  href: string;
  ready: boolean;
  count: number | null;
  alert: boolean;
};

type Props = {
  nav: { group: string; items: FrameNavItem[] }[];
  current: AdminKey;
  crumb: string;
  companyName: string;
  user: { name: string; role: string; initials: string };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
};

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled])";

function trapTab(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function AdminFrame({ nav, current, crumb, companyName, user, signOutAction, children }: Props) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [mac, setMac] = useState(true);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const openPalette = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setDrawer(false);
    setPalette(true);
  }, []);

  const closePalette = useCallback(() => {
    setPalette(false);
    requestAnimationFrame(() => returnFocus.current?.focus());
  }, []);

  // ⌘K / Ctrl+K from anywhere in the admin.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (palette) closePalette();
        else openPalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [palette, openPalette, closePalette]);

  // Drawer: focus in, trap, Escape, scroll lock, focus back to the button.
  useEffect(() => {
    if (!drawer) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawer(false);
        drawerButton.current?.focus();
        return;
      }
      trapTab(event, drawerRef.current);
    };
    const wide = window.matchMedia("(min-width: 960px)");
    const onWide = () => wide.matches && setDrawer(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [drawer]);

  const sidebar = (
    <>
      <div className="admin-brand">
        <span className="flex items-center gap-[10px]">
          <span aria-hidden="true" className="grid grid-cols-[6px_6px] gap-[2px]">
            <span className="size-[6px] bg-on-dark" />
            <span className="size-[6px] border border-on-dark" />
            <span className="size-[6px] border border-on-dark" />
            <span className="size-[6px] bg-acc-on-dark" />
          </span>
          <span className="text-[14px] font-semibold">{companyName}</span>
        </span>
        <span className="admin-tag">CMS</span>
      </div>
      <button type="button" className="admin-search" onClick={openPalette}>
        Search…
        <kbd className="font-mono text-[10px]">{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
      <nav aria-label="Admin" className="flex flex-1 flex-col gap-px px-2 pt-2 pb-4">
        {nav.map((section) => (
          <div key={section.group} className="flex flex-col gap-px">
            <span className="admin-group">{section.group}</span>
            {section.items.map((item) => {
              const on = item.key === current;
              const count =
                item.count !== null ? (
                  <span className={`font-mono text-[10px] ${item.alert ? "text-acc-on-dark" : "text-on-dark-muted"}`}>
                    {item.count}
                  </span>
                ) : null;
              return item.ready ? (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className="admin-nav-item"
                  onClick={() => setDrawer(false)}
                >
                  <span className="flex items-center gap-[10px]">
                    <span aria-hidden="true" className="admin-dot" />
                    {item.label}
                  </span>
                  {count}
                </Link>
              ) : (
                <span key={item.key} className="admin-nav-item" aria-disabled="true">
                  <span className="flex items-center gap-[10px]">
                    <span aria-hidden="true" className="admin-dot" />
                    {item.label}
                  </span>
                  <span className="admin-soon">Soon</span>
                </span>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="admin-user">
        <span className="flex min-w-0 items-center gap-[10px]">
          <span aria-hidden="true" className="admin-avatar">
            {user.initials}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px]">{user.name}</span>
            <span className="font-mono text-[9px] tracking-[0.08em] text-on-dark-muted">{user.role}</span>
          </span>
        </span>
        <form action={signOutAction}>
          <button type="submit" className="admin-logout">
            Log out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="admin-app">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        {sidebar}
      </aside>

      {drawer ? (
        <>
          <div className="admin-scrim" aria-hidden="true" onClick={() => setDrawer(false)} />
          <aside
            ref={drawerRef}
            id="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="admin-sidebar admin-drawer"
          >
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={drawerButton}
              type="button"
              className="admin-menu-button"
              aria-label="Open navigation"
              aria-expanded={drawer}
              aria-controls={drawer ? "admin-drawer" : undefined}
              onClick={() => setDrawer(true)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <span className="admin-crumb">{crumb}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="admin-btn admin-search-mobile" onClick={openPalette} aria-label="Search">
              <span aria-hidden="true">⌕</span>
            </button>
            <a href="/" target="_blank" rel="noopener" className="admin-btn">
              View site ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </header>
        <main id="admin-main" className="admin-main">
          {children}
        </main>
      </div>

      {palette ? <CommandPalette nav={nav} onClose={closePalette} /> : null}
    </div>
  );
}

type Result = { id: string; label: string; kind: string; href: string };

function CommandPalette({ nav, onClose }: { nav: Props["nav"]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [searching, startSearch] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  // Debounced server search; screens are matched locally and instantly.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      startSearch(async () => setHits(await searchAdmin(q)));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const q = query.trim().toLowerCase();
  const screens: Result[] = nav
    .flatMap((section) => section.items)
    .filter((item) => item.ready && (!q || item.label.toLowerCase().includes(q)))
    .map((item) => ({ id: item.key, label: item.label, kind: "Screen", href: item.href }));
  const results: Result[] = [
    ...screens,
    ...hits.filter((hit): hit is SearchHit & { href: string } => hit.href !== null),
  ];
  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  const go = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    router.push(result.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((safeActive + 1) % Math.max(1, results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((safeActive - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[safeActive]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      trapTab(event.nativeEvent, dialogRef.current);
    }
  };

  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div className="admin-palette-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Search the admin" className="admin-palette">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results.length ? optionId(safeActive) : undefined}
          aria-autocomplete="list"
          aria-label="Search"
          placeholder="Search screens, enquiries and content…"
          className="admin-palette-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul id={listId} role="listbox" aria-label="Results" className="admin-palette-list">
          {results.map((result, index) => (
            <li
              key={`${result.kind}-${result.id}`}
              id={optionId(index)}
              role="option"
              aria-selected={index === safeActive}
              className="admin-palette-option"
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                go(result);
              }}
            >
              <span className="truncate">{result.label}</span>
              <span className="font-mono text-[10px] text-label">{result.kind}</span>
            </li>
          ))}
        </ul>
        {results.length === 0 ? (
          <p className="m-0 p-5 text-center text-label" role="status">
            {searching ? "Searching…" : "No results"}
          </p>
        ) : (
          <p className="sr-only" role="status">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
        )}
        <div className="admin-palette-foot" aria-hidden="true">
          <span>↑↓ Navigate · ↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
