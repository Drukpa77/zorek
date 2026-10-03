import type { Status } from "@prisma/client";

// "Live" = published, or scheduled with its time already passed. Evaluated at
// read time, so scheduled content goes live on its own (within the page's
// revalidate window) without depending on a background job.

export const liveWhere = (now = new Date()) => ({
  deletedAt: null,
  OR: [{ status: "PUBLISHED" as const }, { status: "SCHEDULED" as const, publishAt: { lte: now } }],
});

export const isLive = (row: { status: Status; publishAt: Date | null; deletedAt?: Date | null }, now = new Date()) =>
  !row.deletedAt && (row.status === "PUBLISHED" || (row.status === "SCHEDULED" && !!row.publishAt && row.publishAt <= now));

/** Public date for live content: when it was (or was scheduled to be) published. */
export const liveDate = (row: { publishedAt: Date | null; publishAt: Date | null }) => row.publishedAt ?? row.publishAt;
