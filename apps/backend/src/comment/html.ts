import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";

import { autolinkCommitShas } from "./autolink";
import { getExtensions } from "./schema";

/**
 * Render a TipTap rich-text comment as an HTML string. Mentions store only an
 * id, so `mentionLabels` (keyed by the mentioned account id) provides the label
 * to render after `@`; unresolved mentions fall back to "@unknown".
 *
 * `repositoryUrl` is the web URL of the repository the comment is about, which
 * turns the commit shas in it into links — the same thing the app does when it
 * renders the comment. Without it they stay plain text.
 */
export function renderCommentHtml(
  content: JSONContent,
  config: {
    mentionLabels: Map<string, string>;
    repositoryUrl?: string | null;
  },
): string {
  const { repositoryUrl } = config;
  const doc = repositoryUrl
    ? autolinkCommitShas(content, repositoryUrl)
    : content;
  return generateHTML(doc, getExtensions(config));
}
