import type { Status } from "@prisma/client";

// Status names and badge colours shared by every content type (admin UI).

export const statusLabel: Record<Status, string> = {
  DRAFT: "Draft",
  REVIEW: "In review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  TRASHED: "Trashed",
};

export const statusColors: Record<Status, { bg: string; fg: string }> = {
  DRAFT: { bg: "var(--status-draft-bg)", fg: "var(--status-draft-fg)" },
  REVIEW: { bg: "var(--status-draft-bg)", fg: "var(--status-draft-fg)" },
  APPROVED: { bg: "var(--status-draft-bg)", fg: "var(--status-draft-fg)" },
  SCHEDULED: { bg: "var(--status-scheduled-bg)", fg: "var(--status-scheduled-fg)" },
  PUBLISHED: { bg: "var(--status-published-bg)", fg: "var(--status-published-fg)" },
  ARCHIVED: { bg: "var(--status-archived-bg)", fg: "var(--status-archived-fg)" },
  TRASHED: { bg: "var(--status-archived-bg)", fg: "var(--status-archived-fg)" },
};
