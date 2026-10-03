"use client";

import type { Status } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

// Save lifecycle shared by content editors: autosave drafts ~1.4s after the
// last edit (never live content), optimistic-concurrency base timestamp,
// unsaved-changes guard, and ⌘S / Ctrl+S.

export type SaveState = "saved" | "dirty" | "saving" | "error";
export type BaseIntent = "autosave" | "draft" | "publish" | "update" | "unpublish";
type Result = { ok: true; status: Status; updatedAt: string } | { ok: false; error: string };

const AUTOSAVE_MS = 1400;
const isLiveStatus = (s: Status) => s === "PUBLISHED" || s === "SCHEDULED";

export function useContentSave<D, R extends Result>({
  draft,
  initialStatus,
  initialUpdatedAt,
  canPublish,
  send,
  onSaved,
}: {
  draft: D;
  initialStatus: Status;
  initialUpdatedAt: string;
  canPublish: boolean;
  send: (draft: D, intent: BaseIntent, baseUpdatedAt: string) => Promise<R>;
  onSaved?: (result: Extract<R, { ok: true }>, intent: BaseIntent) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const baseUpdatedAt = useRef(initialUpdatedAt);
  const saving = useRef(false);
  const draftRef = useRef(draft);
  const sendRef = useRef(send);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    draftRef.current = draft;
    sendRef.current = send;
    onSavedRef.current = onSaved;
  });

  const live = isLiveStatus(status);
  const dirty = saveState === "dirty" || saveState === "error";

  const markDirty = useCallback(() => setSaveState("dirty"), []);

  const save = useCallback(async (intent: BaseIntent) => {
    if (saving.current) return false;
    saving.current = true;
    setSaveState("saving");
    const snapshot = draftRef.current;
    const result = await sendRef.current(snapshot, intent, baseUpdatedAt.current);
    saving.current = false;
    if (!result.ok) {
      setSaveState("error");
      setError(result.error);
      return false;
    }
    baseUpdatedAt.current = result.updatedAt;
    setStatus(result.status);
    setError("");
    setSavedAt(new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }));
    // Edits made while the request was in flight stay dirty.
    setSaveState(draftRef.current === snapshot ? "saved" : "dirty");
    await onSavedRef.current?.(result as Extract<R, { ok: true }>, intent);
    return true;
  }, []);

  /** After restoring a version: adopt the server's state as the new baseline. */
  const reset = useCallback((next: { status: Status; updatedAt: string }) => {
    baseUpdatedAt.current = next.updatedAt;
    setStatus(next.status);
    setSaveState("saved");
    setError("");
  }, []);

  useEffect(() => {
    if (saveState !== "dirty" || live) return;
    const timer = window.setTimeout(() => void save("autosave"), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, saveState, live, save]);

  useEffect(() => {
    if (!dirty && saveState !== "saving") return;
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty, saveState]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (live) {
          if (canPublish) void save("update");
        } else void save("draft");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [live, canPublish, save]);

  const statusText =
    saveState === "saving"
      ? "SAVING…"
      : saveState === "error"
        ? "NOT SAVED"
        : saveState === "dirty"
          ? live
            ? "UNPUBLISHED CHANGES"
            : "UNSAVED CHANGES"
          : savedAt
            ? `SAVED ${savedAt.toUpperCase()}`
            : "ALL CHANGES SAVED";

  return { status, live, dirty, saveState, statusText, error, markDirty, save, reset };
}
