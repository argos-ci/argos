import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";

import { MentionExtension } from "./schema";

/**
 * Fallback label rendered for a mention whose user can't be resolved (e.g. a
 * deleted account). Mirrors the frontend's "@unknown" fallback.
 */
const UNKNOWN_MENTION_LABEL = "unknown";

/**
 * Render a TipTap rich-text comment as an HTML string. Mentions store only an
 * id, so `mentionLabels` (keyed by the mentioned account id) provides the label
 * to render after `@`; unresolved mentions fall back to "@unknown".
 */
export function renderCommentHtml(
  content: JSONContent,
  mentionLabels?: Map<string, string>,
): string {
  const mention = MentionExtension.configure({
    renderHTML: ({ options, node }) => {
      const id = typeof node.attrs["id"] === "string" ? node.attrs["id"] : null;
      const label =
        (id ? mentionLabels?.get(id) : null) ?? UNKNOWN_MENTION_LABEL;
      return ["span", options.HTMLAttributes, `@${label}`];
    },
  });
  return generateHTML(content, [StarterKit, mention]);
}
