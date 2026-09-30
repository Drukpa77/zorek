import { z } from "zod";

// Rich text is stored as TipTap/ProseMirror JSON so the TipTap editor (step 5)
// can take over without a data migration. Until then case-study editors write
// plain text: blank lines split paragraphs, "- " lines become bullet lists and
// "## " lines become headings. Rendering goes through an allowlist; raw HTML
// is never stored or output.

export type RichMark = { type: "bold" | "italic" | "link"; attrs?: { href?: string } };
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
    content: z.array(node).max(2000).optional(),
    text: z.string().max(20_000).optional(),
    marks: z
      .array(z.object({ type: z.enum(["bold", "italic", "link"]), attrs: z.object({ href: z.string().max(2000).optional() }).optional() }))
      .max(10)
      .optional(),
  }),
);

export const richDocSchema = z.object({ type: z.literal("doc"), content: z.array(node).max(2000) });

export const emptyDoc = (): RichDoc => ({ type: "doc", content: [] });

const textNode = (text: string): RichNode => ({ type: "text", text });

export function textToDoc(input: string): RichDoc {
  const blocks = input.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const content: RichNode[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.every((l) => /^[-*•]\s+/.test(l))) {
      content.push({
        type: "bulletList",
        content: lines.map((l) => ({ type: "listItem", content: [{ type: "paragraph", content: [textNode(l.replace(/^[-*•]\s+/, ""))] }] })),
      });
    } else if (lines.length === 1 && /^#{2,3}\s+/.test(lines[0])) {
      const level = lines[0].startsWith("###") ? 3 : 2;
      content.push({ type: "heading", attrs: { level }, content: [textNode(lines[0].replace(/^#{2,3}\s+/, ""))] });
    } else {
      content.push({ type: "paragraph", content: [textNode(lines.join(" "))] });
    }
  }
  return { type: "doc", content };
}

const plain = (n: RichNode): string => n.text ?? (n.content ?? []).map(plain).join("");

export function docToText(doc: unknown): string {
  const parsed = richDocSchema.safeParse(doc);
  if (!parsed.success) return "";
  return parsed.data.content
    .map((n) => {
      if (n.type === "bulletList" || n.type === "orderedList") return (n.content ?? []).map((li) => `- ${plain(li)}`).join("\n");
      if (n.type === "heading") return `${Number(n.attrs?.level) === 3 ? "###" : "##"} ${plain(n)}`;
      return plain(n);
    })
    .filter(Boolean)
    .join("\n\n");
}

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

export const isDocEmpty = (doc: unknown) => docToText(doc).trim() === "";
