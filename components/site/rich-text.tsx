import { Fragment, type ReactNode } from "react";
import { Picture } from "@/components/work/picture";
import type { MediaView } from "@/lib/media";
import { headingAnchors, type RichNode, sanitizeDoc, safeHref } from "@/lib/rich-text";

// Allowlist renderer: only the node and mark types in lib/rich-text render.
// Content is sanitised again here, so even rows written before the allowlist
// existed can't output anything unexpected.

type Ctx = { media?: Map<string, MediaView>; anchors: string[]; anchorIndex: number };

function renderText(node: RichNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "code") out = <code>{out}</code>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href) {
        const external = /^https?:/.test(href);
        out = (
          <a href={href} className="underline underline-offset-2" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {out}
          </a>
        );
      }
    }
  }
  return <Fragment key={key}>{out}</Fragment>;
}

function renderTable(node: RichNode, key: number, ctx: Ctx) {
  const rows = node.content ?? [];
  const headerRow = rows[0]?.content?.every((c) => c.type === "tableHeader") ? rows[0] : null;
  const bodyRows = headerRow ? rows.slice(1) : rows;
  const cells = (row: RichNode) =>
    (row.content ?? []).map((cell, i) =>
      cell.type === "tableHeader" ? (
        <th key={i} scope={headerRow === row ? "col" : "row"}>
          {renderNodes(cell.content, ctx)}
        </th>
      ) : (
        <td key={i}>{renderNodes(cell.content, ctx)}</td>
      ),
    );
  return (
    <div key={key} className="rt-table" role="region" aria-label="Table" tabIndex={0}>
      <table>
        {headerRow ? (
          <thead>
            <tr>{cells(headerRow)}</tr>
          </thead>
        ) : null}
        <tbody>
          {bodyRows.map((row, i) => (
            <tr key={i}>{cells(row)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderNodes(nodes: RichNode[] | undefined, ctx: Ctx): ReactNode {
  return (nodes ?? []).map((node, i) => {
    switch (node.type) {
      case "text":
        return renderText(node, i);
      case "paragraph":
        return <p key={i}>{renderNodes(node.content, ctx)}</p>;
      case "heading": {
        const id = ctx.anchors[ctx.anchorIndex++];
        return Number(node.attrs?.level) === 3 ? (
          <h3 key={i} id={id}>
            {renderNodes(node.content, ctx)}
          </h3>
        ) : (
          <h2 key={i} id={id}>
            {renderNodes(node.content, ctx)}
          </h2>
        );
      }
      case "bulletList":
        return <ul key={i}>{renderNodes(node.content, ctx)}</ul>;
      case "orderedList":
        return <ol key={i}>{renderNodes(node.content, ctx)}</ol>;
      case "listItem":
        return <li key={i}>{renderNodes(node.content, ctx)}</li>;
      case "blockquote":
        return <blockquote key={i}>{renderNodes(node.content, ctx)}</blockquote>;
      case "codeBlock":
        return (
          <pre key={i} tabIndex={0}>
            <code>{(node.content ?? []).map((c) => c.text ?? "").join("")}</code>
          </pre>
        );
      case "horizontalRule":
        return <hr key={i} />;
      case "hardBreak":
        return <br key={i} />;
      case "callout":
        return (
          <aside key={i} className="rt-callout" aria-label={String(node.attrs?.label ?? "Note")}>
            <span className="rt-callout-label" aria-hidden="true">
              {String(node.attrs?.label ?? "Note")}
            </span>
            {renderNodes(node.content, ctx)}
          </aside>
        );
      case "image": {
        const media = typeof node.attrs?.mediaId === "string" ? ctx.media?.get(node.attrs.mediaId) : undefined;
        if (!media) return null;
        const caption = String(node.attrs?.caption ?? "");
        return (
          <figure key={i} className="rt-figure">
            <Picture media={media} sizes="(min-width: 900px) 700px, 100vw" imgClassName="w-full" />
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        );
      }
      case "table":
        return renderTable(node, i, ctx);
      default:
        return null;
    }
  });
}

export function RichText({ doc, className, media }: { doc: unknown; className?: string; media?: Map<string, MediaView> }) {
  const clean = sanitizeDoc(doc);
  if (clean.content.length === 0) return null;
  const ctx: Ctx = { media, anchors: headingAnchors(clean).map((a) => a.id), anchorIndex: 0 };
  return <div className={`rich-text ${className ?? ""}`}>{renderNodes(clean.content, ctx)}</div>;
}
