import { getSchema } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import type { Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

/**
 * Mention node configuration. The node spec (name, attributes, rendering) MUST
 * stay identical to the frontend editor (`apps/frontend/src/ui/Editor/mention.ts`)
 * so the server reads/writes the same `mention` nodes the client produced and
 * `validateCommentJson` accepts them. The interactive `suggestion` behaviour
 * lives only on the frontend and doesn't affect the schema.
 */
export const MentionExtension = Mention.configure({
  HTMLAttributes: { class: "mention" },
});

/**
 * TipTap extensions used by the comment editor. Must stay in sync with the
 * frontend editor so the backend reads/writes the same node and mark types
 * (paragraphs, lists, headings, marks, links, mentions, ...) the client
 * produced.
 */
export const extensions = [StarterKit, MentionExtension];

/**
 * ProseMirror schema derived from the comment extensions. Reused for HTML
 * rendering and JSON validation so both paths agree on what's allowed.
 */
export const schema: Schema = getSchema(extensions);
