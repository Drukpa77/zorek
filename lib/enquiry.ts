import { z } from "zod";

// Shared by the guided form (client) and submitEnquiry (server) so the options
// and rules can never drift apart.

export const PROJECT_TYPES = [
  "Website",
  "Web Application",
  "Custom Software",
  "Mobile Application",
  "UX / UI",
  "System Integration",
  "Digital Strategy",
  "SEO / Growth",
  "Other",
] as const;

export const EXISTING_OPTIONS = ["Yes", "No", "Not sure"] as const;

export const BUDGETS = ["Under $15k", "$15k – $40k", "$40k – $100k", "$100k +", "Not sure yet"] as const;

export const TIMELINES = ["As soon as possible", "1 – 3 months", "3 – 6 months", "6 months +", "Flexible"] as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Every rule carries a human message: Zod's defaults would echo internals
// (like the option list) back to the caller.
const TOO_LONG = "That answer is too long. Please shorten it.";
const INVALID_OPTION = "Please choose one of the listed options.";

const optional = (max: number) =>
  z
    .string({ error: INVALID_OPTION })
    .trim()
    .max(max, TOO_LONG)
    .transform((value) => value || undefined);

const optionalChoice = <T extends readonly [string, ...string[]]>(options: T) =>
  z.union([z.enum(options), z.literal("")], { error: INVALID_OPTION }).transform((value) => value || undefined);

export const enquirySchema = z.object({
  name: z.string({ error: "Please add your name." }).trim().min(1, "Please add your name.").max(120, TOO_LONG),
  company: optional(160),
  email: z
    .string({ error: "Please enter a valid work email." })
    .trim()
    .max(254, TOO_LONG)
    .regex(EMAIL_PATTERN, "Please enter a valid work email."),
  phone: optional(40),
  projectTypes: z
    .array(z.enum(PROJECT_TYPES, { error: INVALID_OPTION }), { error: "Select at least one option." })
    .min(1, "Select at least one option.")
    .max(PROJECT_TYPES.length, INVALID_OPTION),
  existingSystem: optionalChoice(EXISTING_OPTIONS),
  existingUrl: optional(300),
  description: optional(5000),
  budget: optionalChoice(BUDGETS),
  timeline: optionalChoice(TIMELINES),
});

export type EnquiryInput = z.input<typeof enquirySchema>;

export const referenceFor = (id: string) => `ENQ-${id.slice(-6).toUpperCase()}`;
