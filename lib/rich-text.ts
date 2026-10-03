import { z } from "zod";

// Rich text is TipTap/ProseMirror JSON. One allowlist governs the whole
// pipeline: the editor only offers these nodes, the server strips anything
// else on save (e.g. formatting pasted from other apps), and the renderer
// outputs nothing outside it. Raw HTML is never stored or rendered.

export const NODE_TYPES = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "callout",
  "image",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
] as const;
export const MARK_TYPES = ["bold", "italic", "link", "code"] as const;

export type RichMark = { type: (typeof MARK_TYPES)[number]; attrs?: { href?: string } };
export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
  marks?: RichMark[];
};
export type RichDoc = { type: "doc"; content: RichNode[] };

const node: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(node).max(5000).optional(),
    text: z.string().max(50_000).optional(),
    marks: z
      .array(z.object({ type: z.string().max(20), attrs: z.record(z.string(), z.unknown()).optional() }))
      .max(10)
      .optional() as z.ZodType<RichMark[] | undefined>,
  }),
);

export const richDocSchema = z.object({ type: z.literal("doc"), content: z.array(node).max(5000) });

export const emptyDoc = (): RichDoc => ({ type: "doc", content: [] });

/** Only http(s), mailto and site-relative links survive; anything else (javascript:, data:) is dropped. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (/^\/(?!\/)/.test(value) || /^#[\w-]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Reduces any parsed document to the allowlist: unknown nodes are unwrapped
 * (their text kept) or dropped, unknown marks removed, attributes rebuilt
 * from scratch so nothing unexpected is persisted.
 */
export function sanitizeDoc(input: unknown): RichDoc {
  const parsed = richDocSchema.safeParse(input);
  if (!parsed.success) return emptyDoc();

  const clean = (n: RichNode): RichNode[] => {
    const children = (n.content ?? []).flatMap(clean);
    switch (n.type) {
      case "text": {
        if (!n.text) return [];
        const marks = (n.marks ?? []).flatMap((m): RichMark[] => {
          if (m.type === "link") {
            const href = safeHref(m.attrs?.href);
            return href ? [{ type: "link", attrs: { href } }] : [];
          }
          return (MARK_TYPES as readonly string[]).includes(m.type) ? [{ type: m.type }] : [];
        });
        return [{ type: "text", text: n.text, ...(marks.length ? { marks } : {}) }];
      }
      case "heading": {
        const level = Number(n.attrs?.level) === 3 ? 3 : 2;
        return [{ type: "heading", attrs: { level }, content: children.filter((c) => c.type === "text" || c.type === "hardBreak") }];
      }
      case "codeBlock":
        return [{ type: "codeBlock", content: [{ type: "text", text: (n.content ?? []).map((c) => c.text ?? "").join("") }] }];
      case "image": {
        const mediaId = typeof n.attrs?.mediaId === "string" ? n.attrs.mediaId.slice(0, 40) : null;
        const caption = typeof n.attrs?.caption === "string" ? n.attrs.caption.slice(0, 300) : "";
        return mediaId ? [{ type: "image", attrs: { mediaId, caption } }] : [];
      }
      case "callout": {
        const label = typeof n.attrs?.label === "string" && n.attrs.label.trim() ? n.attrs.label.trim().slice(0, 40) : "Note";
        return [{ type: "callout", attrs: { label }, content: children }];
      }
      case "horizontalRule":
      case "hardBreak":
        return [{ type: n.type }];
      case "doc":
      case "paragraph":
      case "bulletList":
      case "orderedList":
      case "listItem":
      case "blockquote":
      case "table":
      case "tableRow":
      case "tableHeader":
      case "tableCell":
        return [{ type: n.type, content: children }];
      default:
        // Unknown wrapper: keep what's inside rather than lose the words.
        return children;
    }
  };

  const content = parsed.data.content.flatMap(clean);
  return { type: "doc", content };
}

const plain = (n: RichNode): string => n.text ?? (n.content ?? []).map(plain).join(n.type === "tableRow" ? " · " : "");

export function docToText(doc: unknown): string {
  const parsed = richDocSchema.safeParse(doc);
  if (!parsed.success) return "";
  return parsed.data.content
    .map((n) => {
      if (n.type === "bulletList" || n.type === "orderedList") return (n.content ?? []).map((li) => `- ${plain(li)}`).join("\n");
      if (n.type === "table") return (n.content ?? []).map(plain).join("\n");
      return plain(n);
    })
    .filter(Boolean)
    .join("\n\n");
}

export const isDocEmpty = (doc: unknown) => docToText(doc).trim() === "";

export function wordCount(doc: unknown) {
  return docToText(doc).split(/\s+/).filter(Boolean).length;
}

/** Stable, unique anchor ids for headings, shared by the renderer and the table of contents. */
export function headingAnchors(doc: unknown): { level: number; text: string; id: string }[] {
  const parsed = richDocSchema.safeParse(doc);
  if (!parsed.success) return [];
  const used = new Map<string, number>();
  // Depth-first, in document order: the same order the renderer meets headings.
  const headings: RichNode[] = [];
  const walk = (n: RichNode) => {
    if (n.type === "heading") headings.push(n);
    else n.content?.forEach(walk);
  };
  parsed.data.content.forEach(walk);
  return headings
    .map((n) => {
      const text = plain(n).trim();
      const base =
        text
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^\w\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .slice(0, 60) || "section";
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      return { level: Number(n.attrs?.level) === 3 ? 3 : 2, text, id: seen ? `${base}-${seen + 1}` : base };
    });
}

/** Every media id referenced by image nodes. */
export function docMediaIds(doc: unknown): string[] {
  const parsed = richDocSchema.safeParse(doc);
  if (!parsed.success) return [];
  const ids: string[] = [];
  const walk = (n: RichNode) => {
    if (n.type === "image" && typeof n.attrs?.mediaId === "string") ids.push(n.attrs.mediaId);
    n.content?.forEach(walk);
  };
  parsed.data.content.forEach(walk);
  return ids;
}
