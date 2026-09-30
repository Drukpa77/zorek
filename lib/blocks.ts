import { z } from "zod";
import { docToText, emptyDoc, richDocSchema } from "@/lib/rich-text";

// Case-study page builder: one definition per block type drives validation
// (server + render), the editor form, defaults and the list summary.
// Unknown or invalid blocks never render.

const str = (max = 300) => z.string().trim().max(max).default("");
const id = z.string().max(40).nullable().default(null);
const doc = richDocSchema.default(emptyDoc);

export const blockSchemas = {
  heading: z.object({ eyebrow: str(80), text: str(200) }),
  richText: z.object({ label: str(80), lead: str(600), body: doc }),
  fullWidthImage: z.object({ mediaId: id, caption: str(300), annotations: z.array(z.string().trim().max(60)).max(8).default([]) }),
  containedImage: z.object({ mediaId: id, caption: str(300) }),
  twoColumn: z.object({ left: doc, right: doc }),
  imageText: z.object({ mediaId: id, side: z.enum(["left", "right"]).default("left"), body: doc }),
  video: z.object({ mediaId: id, posterId: id, autoplay: z.boolean().default(false) }),
  gallery: z.object({ mediaIds: z.array(z.string().max(40)).max(24).default([]) }),
  deviceMockup: z.object({
    screens: z.array(z.object({ mediaId: id, label: str(60) })).max(5).default([]),
  }),
  quote: z.object({ quote: str(800), name: str(80), role: str(120) }),
  statistic: z.object({
    items: z.array(z.object({ value: str(20), label: str(80) })).max(6).default([]),
    verified: z.boolean().default(false),
  }),
  beforeAfter: z.object({ beforeId: id, afterId: id, beforeLabel: str(60), afterLabel: str(60) }),
  technologyList: z.object({ items: z.array(z.object({ name: str(60), role: str(60) })).max(20).default([]) }),
  servicesList: z.object({ serviceIds: z.array(z.string().max(40)).max(12).default([]) }),
  architecture: z.object({
    heading: str(120),
    note: str(600),
    layers: z
      .array(z.object({ layer: str(40), tech: str(60), parts: z.array(z.string().trim().max(60)).max(6).default([]) }))
      .max(6)
      .default([]),
  }),
  fullScreenMedia: z.object({ mediaId: id }),
  cta: z.object({ heading: str(160), label: str(60), href: str(300) }),
  spacer: z.object({ size: z.enum(["S", "M", "L"]).default("M") }),
} as const;

export type BlockType = keyof typeof blockSchemas;
export type BlockData<T extends BlockType = BlockType> = z.infer<(typeof blockSchemas)[T]>;
export const blockTypes = Object.keys(blockSchemas) as BlockType[];

export function parseBlockData(type: string, data: unknown) {
  if (!(type in blockSchemas)) return null;
  const parsed = blockSchemas[type as BlockType].safeParse(data ?? {});
  return parsed.success ? parsed.data : null;
}

// ---------- Editor field specs ----------

type Base = { name: string; label: string; hint?: string };
export type Field =
  | (Base & { kind: "text"; max: number; placeholder?: string })
  | (Base & { kind: "textarea"; max: number })
  | (Base & { kind: "rich" })
  | (Base & { kind: "media"; accept: "image" | "video" })
  | (Base & { kind: "mediaList" })
  | (Base & { kind: "select"; options: { value: string; label: string }[] })
  | (Base & { kind: "toggle" })
  | (Base & { kind: "tags"; max: number })
  | (Base & { kind: "services" })
  | (Base & { kind: "list"; itemLabel: string; max: number; fields: Field[] });

type Def = { label: string; fields: Field[]; summary: (data: Record<string, unknown>) => string };

const text = (name: string, label: string, max: number, extra: Partial<Base> & { placeholder?: string } = {}): Field => ({ kind: "text", name, label, max, ...extra });
const count = (value: unknown, noun: string) => {
  const n = Array.isArray(value) ? value.length : 0;
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
};

export const blockDefs: Record<BlockType, Def> = {
  heading: {
    label: "Heading",
    fields: [text("eyebrow", "Eyebrow", 80), text("text", "Heading", 200)],
    summary: (d) => String(d.text || "Untitled heading"),
  },
  richText: {
    label: "Rich text",
    fields: [
      text("label", "Label", 80, { placeholder: "e.g. The challenge" }),
      { kind: "textarea", name: "lead", label: "Lead", max: 600 },
      { kind: "rich", name: "body", label: "Body" },
    ],
    summary: (d) => String(d.label || d.lead || "Rich text").slice(0, 60),
  },
  fullWidthImage: {
    label: "Full-width image",
    fields: [
      { kind: "media", name: "mediaId", label: "Image", accept: "image" },
      text("caption", "Caption", 300),
      { kind: "tags", name: "annotations", label: "Annotations", max: 8, hint: "Short technical labels over the image, e.g. Frontend / Next.js" },
    ],
    summary: (d) => String(d.caption || "Full-width image"),
  },
  containedImage: {
    label: "Contained image",
    fields: [{ kind: "media", name: "mediaId", label: "Image", accept: "image" }, text("caption", "Caption", 300)],
    summary: (d) => String(d.caption || "Contained image"),
  },
  twoColumn: {
    label: "Two columns",
    fields: [
      { kind: "rich", name: "left", label: "Left column" },
      { kind: "rich", name: "right", label: "Right column" },
    ],
    summary: (d) => docToText(d.left).slice(0, 60) || "Two columns",
  },
  imageText: {
    label: "Image + text",
    fields: [
      { kind: "media", name: "mediaId", label: "Image", accept: "image" },
      { kind: "select", name: "side", label: "Image side", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
      { kind: "rich", name: "body", label: "Text" },
    ],
    summary: (d) => docToText(d.body).slice(0, 60) || "Image + text",
  },
  video: {
    label: "Video",
    fields: [
      { kind: "media", name: "mediaId", label: "Video", accept: "video" },
      { kind: "media", name: "posterId", label: "Poster image", accept: "image" },
      { kind: "toggle", name: "autoplay", label: "Autoplay (always muted, never for reduced-motion users)" },
    ],
    summary: () => "Video",
  },
  gallery: {
    label: "Gallery",
    fields: [{ kind: "mediaList", name: "mediaIds", label: "Images" }],
    summary: (d) => count(d.mediaIds, "image"),
  },
  deviceMockup: {
    label: "Device mockups",
    fields: [
      {
        kind: "list",
        name: "screens",
        label: "Screens",
        itemLabel: "Screen",
        max: 5,
        fields: [{ kind: "media", name: "mediaId", label: "Screenshot", accept: "image" }, text("label", "Label", 60)],
      },
    ],
    summary: (d) => count(d.screens, "screen"),
  },
  quote: {
    label: "Quote",
    fields: [
      { kind: "textarea", name: "quote", label: "Quote", max: 800 },
      text("name", "Name", 80, { hint: "Hidden on the site until a name is given. Verified quotes only." }),
      text("role", "Role, organisation", 120),
    ],
    summary: (d) => (d.name ? `Quote · ${d.name}` : "Quote · unattributed (hidden)"),
  },
  statistic: {
    label: "Statistics",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Figures",
        itemLabel: "Figure",
        max: 6,
        fields: [text("value", "Value", 20, { placeholder: "e.g. 42%" }), text("label", "Label", 80)],
      },
      { kind: "toggle", name: "verified", label: "These figures are verified", hint: "Unverified figures never appear on the public site." },
    ],
    summary: (d) => `${count(d.items, "figure")} · ${d.verified ? "verified" : "unverified (hidden)"}`,
  },
  beforeAfter: {
    label: "Before / after",
    fields: [
      { kind: "media", name: "beforeId", label: "Before image", accept: "image" },
      text("beforeLabel", "Before label", 60, { placeholder: "Before · legacy system" }),
      { kind: "media", name: "afterId", label: "After image", accept: "image" },
      text("afterLabel", "After label", 60, { placeholder: "After · new platform" }),
    ],
    summary: () => "Before / after",
  },
  technologyList: {
    label: "Technology list",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Technologies",
        itemLabel: "Technology",
        max: 20,
        fields: [text("name", "Name", 60), text("role", "Role", 60, { placeholder: "e.g. Frontend" })],
      },
    ],
    summary: (d) => count(d.items, "technology"),
  },
  servicesList: {
    label: "Services list",
    fields: [{ kind: "services", name: "serviceIds", label: "Services" }],
    summary: (d) => count(d.serviceIds, "service"),
  },
  architecture: {
    label: "Architecture",
    fields: [
      text("heading", "Heading", 120, { placeholder: "The system behind the interface." }),
      {
        kind: "list",
        name: "layers",
        label: "Layers",
        itemLabel: "Layer",
        max: 6,
        fields: [text("layer", "Layer", 40), text("tech", "Technology", 60), { kind: "tags", name: "parts", label: "Parts", max: 6 }],
      },
      { kind: "textarea", name: "note", label: "Architecture notes", max: 600 },
    ],
    summary: (d) => count(d.layers, "layer"),
  },
  fullScreenMedia: {
    label: "Full-bleed media",
    fields: [{ kind: "media", name: "mediaId", label: "Image", accept: "image" }],
    summary: () => "Full-bleed media",
  },
  cta: {
    label: "Call to action",
    fields: [text("heading", "Heading", 160), text("label", "Button label", 60), text("href", "Link", 300, { placeholder: "/contact" })],
    summary: (d) => String(d.heading || "Call to action"),
  },
  spacer: {
    label: "Spacer",
    fields: [{ kind: "select", name: "size", label: "Size", options: ["S", "M", "L"].map((s) => ({ value: s, label: s })) }],
    summary: (d) => `Spacer · ${d.size}`,
  },
};

export const defaultBlockData = (type: BlockType) => blockSchemas[type].parse({}) as Record<string, unknown>;

/** Every media id a block references, for picker previews and usage checks. */
export function mediaIdsIn(data: unknown): string[] {
  const ids: string[] = [];
  const walk = (value: unknown, key?: string) => {
    if (Array.isArray(value)) value.forEach((v) => walk(v, key === "mediaIds" ? "mediaId" : undefined));
    else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, k));
    else if (typeof value === "string" && key && /(mediaId|beforeId|afterId|posterId)$/.test(key)) ids.push(value);
  };
  walk(data);
  return ids;
}
