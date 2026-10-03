import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/case-study-schema";
import { emptyDoc, richDocSchema, sanitizeDoc } from "@/lib/rich-text";

// Browser-safe schema for the insight editor and its server actions.

export const insightInput = z.object({
  title: z.string().trim().min(1, "Add a title.").max(160, "Keep the title under 160 characters."),
  slug: z.string().trim().regex(SLUG_PATTERN, "Slugs use lowercase letters, numbers and single hyphens.").max(80),
  excerpt: z.string().trim().max(300, "Keep the excerpt under 300 characters.").default(""),
  categoryId: z.string().max(40).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(40)).max(10, "Use up to 10 tags.").default([]),
  body: richDocSchema.default(emptyDoc).transform(sanitizeDoc),
  featuredImageId: z.string().max(40).nullable().default(null),
  featured: z.boolean().default(false),
  /** ISO timestamp. In the future → scheduled; in the past or empty → publish now. */
  publishAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "That publish date isn't valid.")
    .nullable()
    .default(null),
  seo: z
    .object({
      title: z.string().trim().max(70, "Keep the SEO title under 70 characters.").default(""),
      description: z.string().trim().max(200, "Keep the meta description under 200 characters.").default(""),
      noindex: z.boolean().default(false),
    })
    .default({ title: "", description: "", noindex: false }),
});

export type InsightInput = z.input<typeof insightInput>;
export type InsightData = z.output<typeof insightInput>;

export const WORDS_PER_MINUTE = 230;
