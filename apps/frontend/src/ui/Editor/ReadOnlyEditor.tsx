import { Fragment, memo } from "react";
import { clsx } from "clsx";

import { EDITOR_PROSE_CLASS } from "./EditorContent.css";

type MarkType =
  | "bold"
  | "italic"
  | "strike"
  | "underline"
  | "code"
  | "link"
  | string;

type Mark = {
  type: MarkType;
  attrs?: { href?: string; target?: string };
};

type Node = {
  type: string;
  attrs?: { level?: number };
  content?: Node[];
  text?: string;
  marks?: Mark[];
};

export type ReadOnlyEditorContent = Node | null | undefined;

export interface ReadOnlyEditorProps {
  content: ReadOnlyEditorContent;
  className?: string;
}

export const ReadOnlyEditor = memo(function ReadOnlyEditor(
  props: ReadOnlyEditorProps,
) {
  const { content, className } = props;
  if (!content || !content.content) {
    return null;
  }
  return (
    <div className={clsx(EDITOR_PROSE_CLASS, className)}>
      {content.content.map((node, index) => renderNode(node, index))}
    </div>
  );
});

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function renderNode(node: Node, key: number): React.ReactNode {
  const children = node.content?.map((child, index) =>
    renderNode(child, index),
  );
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const level = node.attrs?.level;
      const Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" =
        typeof level === "number" && level >= 1 && level <= 6
          ? HEADING_TAGS[level - 1]!
          : "h1";
      return <Tag key={key}>{children}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return renderText(node, key);
    default:
      return null;
  }
}

function renderText(node: Node, key: number): React.ReactNode {
  let element: React.ReactNode = node.text ?? "";
  const marks = node.marks;
  if (marks) {
    for (const mark of marks) {
      switch (mark.type) {
        case "bold":
          element = <strong>{element}</strong>;
          break;
        case "italic":
          element = <em>{element}</em>;
          break;
        case "strike":
          element = <s>{element}</s>;
          break;
        case "underline":
          element = <u>{element}</u>;
          break;
        case "code":
          element = <code>{element}</code>;
          break;
        case "link": {
          const href = mark.attrs?.href;
          if (href) {
            element = (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {element}
              </a>
            );
          }
          break;
        }
        default:
          break;
      }
    }
  }
  return <Fragment key={key}>{element}</Fragment>;
}
