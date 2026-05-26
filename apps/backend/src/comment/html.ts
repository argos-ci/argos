import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";

import { extensions } from "./schema";

/**
 * Render a TipTap rich-text comment as an HTML string.
 */
export function renderCommentHtml(content: JSONContent): string {
  return generateHTML(content, extensions);
}
