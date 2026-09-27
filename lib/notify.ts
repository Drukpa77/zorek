import nodemailer from "nodemailer";
import type { Enquiry } from "@prisma/client";
import { referenceFor } from "@/lib/enquiry";

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  const server = process.env.EMAIL_SERVER;
  if (!server) return null;
  transport ??= nodemailer.createTransport(server);
  return transport;
}

const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

// Best effort: the enquiry is already saved, so a mail failure is logged and
// never surfaced to the visitor.
export async function notifyNewEnquiry(enquiry: Enquiry) {
  const mailer = getTransport();
  const to = process.env.ENQUIRY_NOTIFY_TO;
  if (!mailer || !to) {
    console.warn("[enquiry] EMAIL_SERVER or ENQUIRY_NOTIFY_TO not set; notification skipped.");
    return;
  }

  const reference = referenceFor(enquiry.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const rows: [string, string | null | undefined][] = [
    ["Reference", reference],
    ["Name", enquiry.name],
    ["Company", enquiry.company],
    ["Email", enquiry.email],
    ["Phone", enquiry.phone],
    ["Project types", enquiry.projectTypes.join(", ")],
    ["Existing system", [enquiry.existingSystem, enquiry.existingUrl].filter(Boolean).join(" — ")],
    ["Budget", enquiry.budget],
    ["Timeline", enquiry.timeline],
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value || "—"}`),
    "",
    "Challenge:",
    enquiry.description || "—",
    "",
    site ? `Open in admin: ${site}/admin/enquiries` : "",
  ].join("\n");

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM ?? to,
      to,
      replyTo: enquiry.email,
      subject: oneLine(`New enquiry ${reference} · ${enquiry.name}${enquiry.company ? ` (${enquiry.company})` : ""}`),
      text,
    });
  } catch (error) {
    console.error(`[enquiry] Notification failed for ${reference}`, error);
  }
}
