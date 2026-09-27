"use client";

import { useActionState, useEffect, useState } from "react";
import type { EnquiryStatus } from "@prisma/client";
import { addEnquiryNote, setEnquiryArchived, setEnquiryStatus } from "@/app/admin/enquiries/actions";

const STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "CLOSED"];

const badge: Record<EnquiryStatus, { bg: string; fg: string }> = {
  NEW: { bg: "#E8F0FB", fg: "#1F4E8C" },
  CONTACTED: { bg: "#E8F0FB", fg: "#1F4E8C" },
  QUALIFIED: { bg: "#EEE8FF", fg: "#5A32D6" },
  PROPOSAL: { bg: "#FFF4DE", fg: "#8A5A00" },
  WON: { bg: "#E6F4EA", fg: "#1E6B3A" },
  CLOSED: { bg: "#EEEDE8", fg: "#5C5B56" },
};

export type EnquiryView = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  project: string;
  existing: string;
  budget: string;
  timeline: string;
  description: string;
  date: string;
  status: EnquiryStatus;
  archived: boolean;
  notes: { id: string; body: string; author: string; date: string }[];
};

export function statusBadge(status: EnquiryStatus) {
  return badge[status];
}

export function EnquiryDetail({ enquiry }: { enquiry: EnquiryView }) {
  const [status, setStatus] = useState(enquiry.status);
  useEffect(() => setStatus(enquiry.status), [enquiry.status]);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noteState, noteAction, notePending] = useActionState(addEnquiryNote, null);

  async function changeStatus(next: EnquiryStatus) {
    setPending(true);
    setStatus(next);
    await setEnquiryStatus(enquiry.id, next);
    setPending(false);
  }

  return (
    <aside aria-label="Enquiry detail" className="flex flex-col gap-4 border border-a-border bg-a-panel p-5 lg:sticky lg:top-6">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">{enquiry.name}</h2>
        <p className="text-[13px] text-label">
          {enquiry.company} · {enquiry.date}
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        {(
          [
            ["Email", enquiry.email],
            ["Phone", enquiry.phone],
            ["Looking for", enquiry.project],
            ["Existing", enquiry.existing],
            ["Budget", enquiry.budget],
            ["Timeline", enquiry.timeline],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-faint">{label}</dt>
            <dd className="m-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 bg-a-row p-3 text-[13.5px] leading-[1.55]">{enquiry.description}</p>
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.08em] text-faint uppercase">Status</span>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((item) => {
            const on = item === status;
            const colors = badge[item];
            return (
              <button
                key={item}
                type="button"
                disabled={pending}
                onClick={() => changeStatus(item)}
                className="min-h-8 rounded-full border px-2.5 font-mono text-[10px] tracking-[0.04em] uppercase"
                style={{
                  background: on ? colors.bg : "#fff",
                  color: on ? colors.fg : "#77766F",
                  borderColor: on ? colors.fg : "#E2E0DA",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.08em] text-faint uppercase">
          Internal notes · never public
        </span>
        {enquiry.notes.map((note) => (
          <p key={note.id} className="m-0 border border-[#F1E3B8] bg-[#FFF8E6] p-2.5 text-[13px]">
            {note.body}
            <span className="mt-1 block font-mono text-[10px] tracking-[0.04em] text-faint uppercase">
              {note.author} · {note.date}
            </span>
          </p>
        ))}
        <form action={noteAction} className="flex gap-1.5">
          <input type="hidden" name="id" value={enquiry.id} />
          <label className="sr-only" htmlFor={`note-${enquiry.id}`}>
            Add a note
          </label>
          <input
            id={`note-${enquiry.id}`}
            name="body"
            placeholder="Add a note…"
            className="h-11 min-w-0 flex-1 border border-a-input bg-white px-2.5 text-[16px]"
          />
          <button type="submit" disabled={notePending} className="h-11 bg-ink px-3 text-[13px] text-on-dark">
            Add
          </button>
        </form>
        {noteState?.error ? (
          <p role="alert" className="m-0 text-[13px] text-alert">
            {noteState.error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-a-row pt-3">
        <a
          href={`mailto:${enquiry.email}`}
          className="inline-flex min-h-11 items-center bg-acc px-3 text-[13px] text-white"
        >
          Email client ↗
        </a>
        <button
          type="button"
          className="min-h-11 border border-a-input px-3 text-[13px]"
          onClick={async () => {
            await navigator.clipboard.writeText(enquiry.email);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy email"}
        </button>
        <button
          type="button"
          className="min-h-11 border border-a-input px-3 text-[13px]"
          onClick={() => changeStatus("CONTACTED")}
        >
          Mark contacted
        </button>
        <button
          type="button"
          className="min-h-11 border border-a-input px-3 text-[13px] text-label"
          onClick={() => setEnquiryArchived(enquiry.id, !enquiry.archived)}
        >
          {enquiry.archived ? "Restore" : "Archive"}
        </button>
      </div>
    </aside>
  );
}
