import type { JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html/server";
import { marked } from "marked";

import { boom } from "@/util/error";

import { getExtensions } from "./schema";
import { validateCommentJson } from "./validate";

/**
 * Resolve a comment/review body submitted through the public API into the
 * rich-text (TipTap/ProseMirror) JSON the rest of the system stores.
 *
 * The API accepts two forms so a CLI can stay ergonomic while power users keep
 * full control:
 * - a **string**, interpreted as Markdown and converted to rich-text JSON using
 *   the same schema the editor uses, so headings, lists, emphasis, links, etc.
 *   are preserved;
 * - an **object**, treated as raw rich-text JSON (the form the web app sends),
 *   validated against the comment schema.
 *
 * Note: `@mentions` are stored by user id and therefore can't be expressed in
 * Markdown — use the raw-JSON form to mention users.
 *
 * Length/empty/sanitize limits are enforced downstream by `createBuildComment`,
 * `updateBuildComment` and `createBuildReview`; this only produces the document.
 */
export async function resolveCommentBody(
  input: string | object,
): Promise<JSONContent> {
  if (typeof input === "string") {
    // `marked` may run async extensions, so await covers both the sync and the
    // async cases without forcing a particular return type.
    const html = await marked.parse(input);
    // generateJSON builds the doc against the comment schema, so the output is
    // structurally valid by construction; nodes Markdown can produce that the
    // schema doesn't allow are simply dropped.
    return generateJSON(html, getExtensions()) as JSONContent;
  }

  if (!validateCommentJson(input)) {
    throw boom(
      400,
      "Invalid comment body. Expected Markdown text or a valid rich-text JSON document.",
    );
  }

  return input;
}
