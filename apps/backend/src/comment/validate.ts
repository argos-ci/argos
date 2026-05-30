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
