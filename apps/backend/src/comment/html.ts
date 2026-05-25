import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";

const extensions = [StarterKit];

/**
 * Render a TipTap rich-text comment as an HTML string.
 *
 * Uses the same `StarterKit` extension set as the editor in the frontend so
 * the schema (paragraphs, lists, headings, marks, links, ...) matches the
 * content the client produced.
 */
export function renderCommentHtml(content: JSONContent): string {
  return generateHTML(content, extensions);
}
