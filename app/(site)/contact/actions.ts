"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { type EnquiryInput, enquirySchema, referenceFor } from "@/lib/enquiry";
import { notifyNewEnquiry } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type EnquiryResult = { ok: true; reference: string } | { ok: false; error: string };

type Meta = { startedAt: number; website: string };

const MIN_FILL_MS = 3_000;
const FAKE_REFERENCE = () => `ENQ-${Math.random().toString(36).slice(-6).toUpperCase()}`;

export async function submitEnquiry(input: EnquiryInput, meta: Meta): Promise<EnquiryResult> {
  // Bots fill the hidden field or submit instantly. Show them a normal success
  // so they have nothing to tune against.
  if (meta.website || Date.now() - meta.startedAt < MIN_FILL_MS) {
    return { ok: true, reference: FAKE_REFERENCE() };
  }

  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`enquiry:${ip}`, 5, 10 * 60_000)) {
    return { ok: false, error: "Too many enquiries from this connection. Please try again shortly or email us." };
  }

  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details and try again." };
  }

  const data = parsed.data;
  try {
    const enquiry = await prisma.enquiry.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        existingUrl: data.existingSystem === "Yes" ? data.existingUrl : undefined,
      },
    });
    after(() => notifyNewEnquiry(enquiry));
    return { ok: true, reference: referenceFor(enquiry.id) };
  } catch (error) {
    console.error("[enquiry] Failed to save enquiry", error);
    return { ok: false, error: "We couldn't send your brief just now. Please try again or email us directly." };
  }
}
