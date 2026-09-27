"use server";

import { revalidatePath } from "next/cache";
import type { EnquiryStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

const statuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "CLOSED"] as const;

const idSchema = z.string().trim().min(1);

async function log(userId: string, enquiryId: string, action: string, summary: string) {
  await prisma.activityLog.create({
    data: { userId, action, entityType: "Enquiry", entityId: enquiryId, summary },
  });
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  const user = await requireRole("EDITOR");
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = z.enum(statuses).safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return { error: "That update could not be saved." };

  await prisma.enquiry.update({
    where: { id: parsedId.data },
    data: { status: parsedStatus.data },
  });
  await log(user.id, parsedId.data, "enquiry.status", `Status set to ${parsedStatus.data}`);
  return { ok: true };
}

export async function addEnquiryNote(_state: { error?: string } | null, formData: FormData) {
  const user = await requireRole("EDITOR");
  const parsed = z
    .object({
      id: idSchema,
      body: z.string().trim().min(1, "Write a note before adding it.").max(2000, "That note is too long."),
    })
    .safeParse({ id: formData.get("id"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the note and try again." };

  await prisma.enquiryNote.create({
    data: { enquiryId: parsed.data.id, authorId: user.id, body: parsed.data.body },
  });
  await log(user.id, parsed.data.id, "enquiry.note", "Added an internal note");
  return null;
}

export async function setEnquiryArchived(id: string, archived: boolean) {
  const user = await requireRole("EDITOR");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "That enquiry could not be updated." };

  await prisma.enquiry.update({
    where: { id: parsedId.data },
    data: { archivedAt: archived ? new Date() : null },
  });
  await log(user.id, parsedId.data, "enquiry.archive", archived ? "Archived" : "Restored");
  return { ok: true };
}
