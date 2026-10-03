import { z } from "zod";
import { blockSchemas, parseBlockData, type BlockType } from "@/lib/blocks";

// Browser-safe case-study schema and labels, shared by the editor (client)
// and the server actions. Nothing here may import server-only modules.

export const PROJECT_TYPES = ["Software", "Web", "Mobile"] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const blockInput = z
  .object({
    id: z.string().max(40).optional(),
    type: z.enum(Object.keys(blockSchemas) as [BlockType, ...BlockType[]]),
    hidden: z.boolean().default(false),
    data: z.unknown(),
  })
  .transform((block, ctx) => {
    const data = parseBlockData(block.type, block.data);
    if (!data) {
      ctx.addIssue({ code: "custom", message: `A ${block.type} block has invalid content.` });
      return z.NEVER;
    }
    return { ...block, data };
  });

export const caseStudyInput = z.object({
  name: z.string().trim().min(1, "Add a project name.").max(120, "Keep the project name under 120 characters."),
  clientName: z.string().trim().max(120).default(""),
  slug: z.string().trim().regex(SLUG_PATTERN, "Slugs use lowercase letters, numbers and single hyphens.").max(80),
  shortDescription: z.string().trim().max(400, "Keep the short description under 400 characters.").default(""),
  year: z.number().int().min(1990).max(2100).nullable().default(null),
  industryId: z.string().max(40).nullable().default(null),
  projectType: z.enum(PROJECT_TYPES).nullable().default(null),
  services: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  technologies: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  featured: z.boolean().default(false),
  heroImageId: z.string().max(40).nullable().default(null),
  seo: z
    .object({
      title: z.string().trim().max(70, "Keep the SEO title under 70 characters.").default(""),
      description: z.string().trim().max(200, "Keep the meta description under 200 characters.").default(""),
      noindex: z.boolean().default(false),
    })
    .default({ title: "", description: "", noindex: false }),
  blocks: z.array(blockInput).max(60, "A case study can have up to 60 blocks."),
});

export type CaseStudyInput = z.input<typeof caseStudyInput>;
export type CaseStudyData = z.output<typeof caseStudyInput>;

export { statusColors, statusLabel } from "@/lib/content-status";
