"use client";

import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  type Editor,
  EditorContent,
  mergeAttributes,
  Node,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { MediaPickerDialog } from "@/components/admin/media-picker";
import type { MediaView } from "@/lib/media";
import { type RichDoc, safeHref, sanitizeDoc } from "@/lib/rich-text";

// ---------- Media context for image node views ----------

type MediaCtx = { media: Record<string, MediaView>; addMedia: (m: MediaView) => void };
const MediaContext = createContext<MediaCtx>({ media: {}, addMedia: () => {} });

// ---------- Custom nodes (mirror the allowlist in lib/rich-text) ----------

function CalloutView({ node, updateAttributes }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="aside" className="rt-callout">
      <input
        className="rt-callout-label-input"
        value={String(node.attrs.label ?? "")}
        maxLength={40}
        aria-label="Callout label"
        onChange={(e) => updateAttributes({ label: e.target.value })}
        contentEditable={false}
      />
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ label: { default: "Key takeaway" } }),
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", mergeAttributes(HTMLAttributes, { "data-callout": "" }), 0],
  addNodeView: () => ReactNodeViewRenderer(CalloutView),
});

function ImageView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const { media } = useContext(MediaContext);
  const m = media[String(node.attrs.mediaId)];
  return (
    <NodeViewWrapper as="figure" className="rt-editor-figure" data-selected={selected || undefined} contentEditable={false}>
      {m?.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.srcSet ? (m.largest ?? m.thumb) : m.thumb} alt={m.alt} />
      ) : (
        <span className="admin-media-thumb flex items-center justify-center text-[12px]">Image missing from the library</span>
      )}
      {m && !m.alt ? <span className="text-[11.5px] text-[#8A5A00]">This image has no alt text. Add it in the media library.</span> : null}
      <span className="flex gap-2">
        <input
          className="admin-field h-8 min-w-0 flex-1 text-[13px]"
          value={String(node.attrs.caption ?? "")}
          placeholder="Caption (optional)"
          aria-label="Image caption"
          maxLength={300}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
        />
        <button type="button" className="admin-btn-sm admin-btn-danger" onClick={() => deleteNode()}>
          Remove image
        </button>
      </span>
    </NodeViewWrapper>
  );
}

const MediaImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ mediaId: { default: null }, caption: { default: "" } }),
  parseHTML: () => [{ tag: "figure[data-media-id]", getAttrs: (el) => ({ mediaId: (el as HTMLElement).dataset.mediaId }) }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes({ "data-media-id": HTMLAttributes.mediaId })],
  addNodeView: () => ReactNodeViewRenderer(ImageView),
});

// ---------- Toolbar ----------

type Tool = { key: string; label: string; text: string; active?: (e: Editor) => boolean; run: (e: Editor) => void; className?: string };

const FULL_TOOLS = (openLink: () => void, openImage: () => void): Tool[] => [
  { key: "h2", label: "Heading", text: "H2", active: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { key: "h3", label: "Subheading", text: "H3", active: (e) => e.isActive("heading", { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { key: "p", label: "Paragraph", text: "¶", active: (e) => e.isActive("paragraph"), run: (e) => e.chain().focus().setParagraph().run() },
  ...COMPACT_TOOLS(openLink),
  { key: "code", label: "Inline code", text: "</>", active: (e) => e.isActive("code"), run: (e) => e.chain().focus().toggleCode().run() },
  { key: "pre", label: "Code block", text: "{ }", active: (e) => e.isActive("codeBlock"), run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { key: "hr", label: "Divider", text: "—", run: (e) => e.chain().focus().setHorizontalRule().run() },
  { key: "img", label: "Image", text: "▣", run: () => openImage() },
  {
    key: "callout",
    label: "Callout",
    text: "!",
    active: (e) => e.isActive("callout"),
    run: (e) => (e.isActive("callout") ? e.chain().focus().lift("callout").run() : e.chain().focus().wrapIn("callout").run()),
  },
  { key: "table", label: "Table", text: "⊞", active: (e) => e.isActive("table"), run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { key: "undo", label: "Undo", text: "↶", run: (e) => e.chain().focus().undo().run() },
  { key: "redo", label: "Redo", text: "↷", run: (e) => e.chain().focus().redo().run() },
];

const COMPACT_TOOLS = (openLink: () => void): Tool[] => [
  { key: "b", label: "Bold", text: "B", className: "font-bold", active: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { key: "i", label: "Italic", text: "I", className: "italic", active: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  { key: "link", label: "Link", text: "Link", active: (e) => e.isActive("link"), run: () => openLink() },
  { key: "ul", label: "Bulleted list", text: "• List", active: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  { key: "ol", label: "Numbered list", text: "1. List", active: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { key: "quote", label: "Quote", text: "“ ”", active: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
];

function Toolbar({ editor, tools, label }: { editor: Editor; tools: Tool[]; label: string }) {
  const [focusIndex, setFocusIndex] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // WAI toolbar pattern: one tab stop, arrows move between buttons.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = tools.length - 1;
    const next =
      event.key === "ArrowRight" ? (focusIndex === last ? 0 : focusIndex + 1)
      : event.key === "ArrowLeft" ? (focusIndex === 0 ? last : focusIndex - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  };
  return (
    <div role="toolbar" aria-label={label} aria-orientation="horizontal" className="rt-toolbar" onKeyDown={onKeyDown}>
      {tools.map((tool, i) => (
        <button
          key={tool.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          tabIndex={i === focusIndex ? 0 : -1}
          aria-label={tool.label}
          aria-pressed={tool.active ? tool.active(editor) : undefined}
          title={tool.label}
          className={`rt-tool ${tool.className ?? ""}`}
          onMouseDown={(e) => e.preventDefault() /* keep the editor's selection */}
          onFocus={() => setFocusIndex(i)}
          onClick={() => tool.run(editor)}
        >
          {tool.text}
        </button>
      ))}
    </div>
  );
}

function TableTools({ editor }: { editor: Editor }) {
  const run = (fn: () => boolean) => () => fn();
  const c = () => editor.chain().focus();
  return (
    <div className="rt-table-tools" role="group" aria-label="Table">
      <span className="font-mono text-[10px] text-label">TABLE</span>
      <button type="button" className="admin-btn-sm" onClick={run(() => c().addRowAfter().run())}>+ Row</button>
      <button type="button" className="admin-btn-sm" onClick={run(() => c().addColumnAfter().run())}>+ Column</button>
      <button type="button" className="admin-btn-sm" onClick={run(() => c().deleteRow().run())}>− Row</button>
      <button type="button" className="admin-btn-sm" onClick={run(() => c().deleteColumn().run())}>− Column</button>
      <button type="button" className="admin-btn-sm" onClick={run(() => c().toggleHeaderRow().run())}>Header row</button>
      <button type="button" className="admin-btn-sm admin-btn-danger" onClick={run(() => c().deleteTable().run())}>Delete table</button>
    </div>
  );
}

function LinkDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [href, setHref] = useState(String(editor.getAttributes("link").href ?? ""));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  useEffect(() => inputRef.current?.focus(), []);
  const apply = () => {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return onClose();
    }
    const safe = safeHref(/^[\w-]+\.[a-z]{2,}/i.test(value) ? `https://${value}` : value);
    if (!safe) return setError("Use a full web address (https://…), an email (mailto:…) or a site path (/work).");
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
    onClose();
  };
  return (
    <div className="admin-palette-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="admin-confirm"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
            editor.commands.focus();
          }
        }}
      >
        <h2 id={titleId} className="m-0 text-[18px] font-semibold">
          Link
        </h2>
        <input
          ref={inputRef}
          className="admin-field"
          value={href}
          onChange={(e) => {
            setHref(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
          placeholder="https://… or /work"
          aria-label="Link address"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${titleId}-err` : undefined}
        />
        {error ? (
          <p id={`${titleId}-err`} role="alert" className="m-0 text-[12.5px] text-[var(--destructive)]">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          {editor.isActive("link") ? (
            <button type="button" className="admin-btn" onClick={() => (editor.chain().focus().extendMarkRange("link").unsetLink().run(), onClose())}>
              Remove link
            </button>
          ) : null}
          <button type="button" className="admin-btn" onClick={() => (onClose(), editor.commands.focus())}>
            Cancel
          </button>
          <button type="button" className="admin-btn-primary" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Editor ----------

export function RichTextEditor({
  label,
  value,
  onChange,
  variant = "full",
  placeholder,
  media = {},
  addMedia = () => {},
  minHeight,
}: {
  label: string;
  value: unknown;
  onChange: (doc: RichDoc) => void;
  variant?: "full" | "compact";
  placeholder?: string;
  media?: Record<string, MediaView>;
  addMedia?: (m: MediaView) => void;
  minHeight?: number;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const labelId = useId();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => Boolean(safeHref(url)),
        },
        ...(variant === "compact" ? { heading: false, codeBlock: false, code: false, horizontalRule: false } : {}),
      }),
      ...(variant === "full" ? [Callout, MediaImage, Table.configure({ resizable: false }), TableRow, TableHeader, TableCell] : []),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    content: sanitizeDoc(value),
    editorProps: {
      attributes: {
        class: `rt-editor ${variant === "compact" ? "rt-editor-compact" : ""}`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        ...(minHeight ? { style: `min-height:${minHeight}px` } : {}),
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current(sanitizeDoc(e.getJSON())),
  });

  const tools = variant === "full" ? FULL_TOOLS(() => setLinkOpen(true), () => setImageOpen(true)) : COMPACT_TOOLS(() => setLinkOpen(true));

  return (
    <MediaContext.Provider value={{ media, addMedia }}>
      <div className="rt-wrap" data-variant={variant}>
        <span id={labelId} className={variant === "compact" ? "admin-eyebrow" : "sr-only"}>
          {label}
        </span>
        {editor ? <Toolbar editor={editor} tools={tools} label={`${label} formatting`} /> : <div className="rt-toolbar" aria-hidden="true" />}
        {editor && variant === "full" && editor.isActive("table") ? <TableTools editor={editor} /> : null}
        <EditorContent editor={editor} />
        {linkOpen && editor ? <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} /> : null}
        {imageOpen && editor ? (
          <MediaPickerDialog
            kind="image"
            onClose={() => {
              setImageOpen(false);
              editor.commands.focus();
            }}
            onPick={(m) => {
              addMedia(m);
              editor.chain().focus().insertContent({ type: "image", attrs: { mediaId: m.id, caption: "" } }).run();
              setImageOpen(false);
            }}
          />
        ) : null}
      </div>
    </MediaContext.Provider>
  );
}
