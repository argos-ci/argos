import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";

import { getExtensions } from "./schema";

/**
 * Render a TipTap rich-text comment as an HTML string. Mentions store only an
 * id, so `mentionLabels` (keyed by the mentioned account id) provides the label
 * to render after `@`; unresolved mentions fall back to "@unknown".
 */
export function renderCommentHtml(
  content: JSONContent,
  config: {
    mentionLabels: Map<string, string>;
  },
): string {
  return generateHTML(content, getExtensions(config));
}
