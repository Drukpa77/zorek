import { Fragment, type ReactNode } from "react";
import { type RichNode, richDocSchema, safeHref } from "@/lib/rich-text";

function renderText(node: RichNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
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

function renderNodes(nodes: RichNode[] | undefined): ReactNode {
  return (nodes ?? []).map((node, i) => {
    const children = renderNodes(node.content);
    switch (node.type) {
      case "text":
        return renderText(node, i);
      case "paragraph":
        return <p key={i}>{children}</p>;
      case "heading":
        return Number(node.attrs?.level) === 3 ? <h4 key={i}>{children}</h4> : <h3 key={i}>{children}</h3>;
      case "bulletList":
        return <ul key={i}>{children}</ul>;
      case "orderedList":
        return <ol key={i}>{children}</ol>;
      case "listItem":
        return <li key={i}>{children}</li>;
      case "blockquote":
        return <blockquote key={i}>{children}</blockquote>;
      case "hardBreak":
        return <br key={i} />;
      default:
        return null; // unknown nodes never render
    }
  });
}

export function RichText({ doc, className }: { doc: unknown; className?: string }) {
  const parsed = richDocSchema.safeParse(doc);
  if (!parsed.success || parsed.data.content.length === 0) return null;
  return <div className={`rich-text ${className ?? ""}`}>{renderNodes(parsed.data.content)}</div>;
}
