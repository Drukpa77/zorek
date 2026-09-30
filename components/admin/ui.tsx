"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

// Shared admin primitives: toast (announced politely) and a confirm dialog
// that traps focus, defaults to Cancel and restores focus on close.

export function useToast() {
  const [toast, setToast] = useState("");
  const notify = useCallback((message: string) => {
    setToast("");
    requestAnimationFrame(() => setToast(message));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return { toast, notify };
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="admin-toast-region" aria-live="polite" role="status">
      {message ? <div className="admin-toast">{message}</div> : null}
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  cta,
  tone = "danger",
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  cta: string;
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Safe default: focus lands on Cancel, not the action.
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onCancel]);

  return (
    <div className="admin-palette-scrim items-center">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} className="admin-confirm">
        <h2 id={titleId} className="m-0 text-[18px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p id={bodyId} className="m-0 text-[13.5px] leading-[1.5] text-label">
          {body}
        </p>
        <div className="mt-1.5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="admin-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={tone === "danger" ? "admin-btn admin-btn-danger-solid" : "admin-btn-primary"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
            }}
          >
            {busy ? "Working…" : cta}
          </button>
        </div>
      </div>
    </div>
  );
}
