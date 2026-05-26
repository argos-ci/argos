import type { EditorValue } from "./Editor";

/**
 * Returns true when the editor value contains at least one non-empty text node
 * or a node with nested content.
 */
export function hasEditorContent(value: EditorValue): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) {
    return false;
  }
  return content.some((node) => {
    if (!node || typeof node !== "object") {
      return false;
    }
    const text = (node as { text?: string }).text;
    if (typeof text === "string" && text.trim().length > 0) {
      return true;
    }
    const inner = (node as { content?: unknown }).content;
    return Array.isArray(inner) && inner.length > 0;
  });
}
