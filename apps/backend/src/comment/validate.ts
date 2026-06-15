import type { JSONContent } from "@tiptap/core";

import { schema } from "./schema";

/**
 * Check that a value is a valid top-level comment document for the comment
 * ProseMirror schema.
 *
 * Validates in two passes:
 * - `schema.nodeFromJSON` rejects unknown node/mark types, missing required
 *   attributes, and empty text nodes.
 * - `node.check()` rejects content that doesn't match a node type's content
 *   expression (e.g. a paragraph nested inside another paragraph).
 *
 * Also enforces that the root node is the schema's top node (`doc`), so a
 * bare paragraph or other non-root node is rejected.
 */
export function validateCommentJson(value: unknown): value is JSONContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  try {
    const node = schema.nodeFromJSON(value);
    if (node.type !== schema.topNodeType) {
      return false;
    }
    node.check();
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether an inline node carries no meaningful content, i.e. it's a line break
 * (`hardBreak`) or a whitespace-only text node.
 */
function isBlankInline(node: JSONContent): boolean {
  if (node.type === "hardBreak") {
    return true;
  }
  return node.type === "text" && (node.text ?? "").trim().length === 0;
}

/**
 * Whether a top-level node is a "blank" paragraph, i.e. one carrying no
 * meaningful content (no children, or only line breaks and whitespace). Such
 * paragraphs are produced by trailing/leading newlines in the editor.
 */
function isBlankParagraph(node: JSONContent): boolean {
  if (node.type !== "paragraph") {
    return false;
  }
  const content = node.content;
  if (!content || content.length === 0) {
    return true;
  }
  return content.every(isBlankInline);
}

/**
 * Trim leading and/or trailing line breaks (`hardBreak`) from a paragraph's
 * inline content. Returns the same node when there is nothing to trim or it
 * isn't a paragraph.
 */
function trimParagraphBreaks(
  node: JSONContent,
  options: { leading: boolean; trailing: boolean },
): JSONContent {
  if (node.type !== "paragraph") {
    return node;
  }
  const content = node.content;
  if (!content || content.length === 0) {
    return node;
  }

  let start = 0;
  let end = content.length;
  if (options.leading) {
    while (start < end && content[start]!.type === "hardBreak") {
      start += 1;
    }
  }
  if (options.trailing) {
    while (end > start && content[end - 1]!.type === "hardBreak") {
      end -= 1;
    }
  }

  if (start === 0 && end === content.length) {
    return node;
  }

  return { ...node, content: content.slice(start, end) };
}

/**
 * Strip leading and trailing blank paragraphs from a (structurally valid)
 * comment document, then trim line breaks at the very start and end of the
 * remaining content, so empty lines and line breaks typed before/after the
 * content don't get persisted. Returns the same value when there is nothing to
 * trim.
 */
export function sanitizeCommentJson(value: JSONContent): JSONContent {
  const content = value.content;
  if (!Array.isArray(content)) {
    return value;
  }

  let start = 0;
  let end = content.length;
  while (start < end && isBlankParagraph(content[start]!)) {
    start += 1;
  }
  while (end > start && isBlankParagraph(content[end - 1]!)) {
    end -= 1;
  }

  const trimmed = content.slice(start, end);

  // Trim line breaks at the boundaries of the surviving content (leading breaks
  // on the first block, trailing breaks on the last block).
  if (trimmed.length > 0) {
    const lastIndex = trimmed.length - 1;
    trimmed[0] = trimParagraphBreaks(trimmed[0]!, {
      leading: true,
      trailing: lastIndex === 0,
    });
    if (lastIndex > 0) {
      trimmed[lastIndex] = trimParagraphBreaks(trimmed[lastIndex]!, {
        leading: false,
        trailing: true,
      });
    }
  }

  const changed =
    trimmed.length !== content.length ||
    trimmed.some((node, index) => node !== content[index]);
  if (!changed) {
    return value;
  }

  return { ...value, content: trimmed };
}

/**
 * Check whether a (structurally valid) comment document carries no meaningful
 * content, i.e. it holds only whitespace. Used to reject empty comments
 * submitted directly through the API.
 */
export function isCommentEmpty(value: JSONContent): boolean {
  try {
    const node = schema.nodeFromJSON(value);
    return node.textContent.trim().length === 0;
  } catch {
    return true;
  }
}

/**
 * Upper bounds on a comment's content. The client enforces a matching character
 * limit for UX, but anyone can craft a request directly, so these guard the
 * server independently:
 * - characters protects against walls of text,
 * - JSON bytes protects storage and bandwidth from abuse,
 * - node count protects rendering from huge documents,
 * - depth protects recursive rendering from pathological nesting.
 */
const MAX_COMMENT_CHARACTERS = 2_000;
const MAX_COMMENT_JSON_BYTES = 20_000;
const MAX_COMMENT_NODES = 300;
const MAX_COMMENT_DEPTH = 12;

type CommentContentStats = {
  characters: number;
  nodes: number;
  maxDepth: number;
};

/**
 * Check whether a (structurally valid) comment document exceeds any of the
 * content limits. Returns `true` when the comment is too large and should be
 * rejected. Schema/type validation is handled separately by
 * {@link validateCommentJson}.
 */
export function isCommentTooLarge(value: JSONContent): boolean {
  if (
    Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_COMMENT_JSON_BYTES
  ) {
    return true;
  }

  const stats: CommentContentStats = { characters: 0, nodes: 0, maxDepth: 0 };
  visitCommentContent(value, 1, stats);

  return (
    stats.characters > MAX_COMMENT_CHARACTERS ||
    stats.nodes > MAX_COMMENT_NODES ||
    stats.maxDepth > MAX_COMMENT_DEPTH
  );
}

function visitCommentContent(
  content: JSONContent,
  depth: number,
  stats: CommentContentStats,
): void {
  stats.nodes += 1;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (typeof content.text === "string") {
    stats.characters += content.text.length;
  }

  for (const child of content.content ?? []) {
    visitCommentContent(child, depth + 1, stats);
  }
}
