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
