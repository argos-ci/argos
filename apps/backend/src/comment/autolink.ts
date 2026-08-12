import { findCommitShas } from "@argos/util/git";
import type { JSONContent } from "@tiptap/core";

/**
 * Marks that mean a piece of text must be left exactly as written: `code` is an
 * explicit "render this literally", and `link` already points somewhere. Kept in
 * sync with the frontend's decoration-based autolink
 * (`apps/frontend/src/ui/Editor/commitAutolink.ts`) so a comment reads the same
 * in an email as it does in the app.
 */
const OPAQUE_MARKS = new Set(["code", "link"]);

function hasOpaqueMark(node: JSONContent): boolean {
  return Boolean(node.marks?.some((mark) => OPAQUE_MARKS.has(mark.type)));
}

/**
 * Split a text node around the commit shas it contains, linking each one. The
 * pieces keep the node's original marks, so a sha inside bold text stays bold.
 */
function linkTextNode(node: JSONContent, repositoryUrl: string): JSONContent[] {
  const { text } = node;
  if (!text || hasOpaqueMark(node)) {
    return [node];
  }
  const matches = findCommitShas(text);
  if (matches.length === 0) {
    return [node];
  }
  const marks = node.marks ?? [];
  const nodes: JSONContent[] = [];
  let cursor = 0;
  for (const { sha, index } of matches) {
    if (index > cursor) {
      nodes.push({ ...node, text: text.slice(cursor, index) });
    }
    nodes.push({
      ...node,
      text: sha,
      marks: [
        ...marks,
        { type: "link", attrs: { href: `${repositoryUrl}/commit/${sha}` } },
      ],
    });
    cursor = index + sha.length;
  }
  if (cursor < text.length) {
    nodes.push({ ...node, text: text.slice(cursor) });
  }
  return nodes;
}

function transformNode(
  node: JSONContent,
  repositoryUrl: string,
): JSONContent[] {
  if (node.type === "text") {
    return linkTextNode(node, repositoryUrl);
  }
  // A code block is verbatim by definition — don't look inside it.
  if (node.type === "codeBlock" || !Array.isArray(node.content)) {
    return [node];
  }
  return [
    {
      ...node,
      content: node.content.flatMap((child) =>
        transformNode(child, repositoryUrl),
      ),
    },
  ];
}

/**
 * Return a copy of a comment document with every commit sha turned into a link
 * to its commit on the repository host.
 *
 * The stored document is never touched: the link belongs to the repository the
 * project points at *now*, so it is added at render time — the same reason the
 * app renders these as decorations rather than persisting marks.
 */
export function autolinkCommitShas(
  content: JSONContent,
  repositoryUrl: string,
): JSONContent {
  const [transformed] = transformNode(content, repositoryUrl);
  return transformed ?? content;
}
