import { getSchema } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import type { Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

/**
 * Mention node configuration. The node spec (name, attributes, rendering) MUST
 * stay identical to the frontend editor (`apps/frontend/src/ui/Editor/mention.tsx`)
 * so the server reads/writes the same `mention` nodes the client produced and
 * `validateCommentJson` accepts them. The interactive `suggestion` behaviour
 * lives only on the frontend and doesn't affect the schema.
 *
 * The node persists **only the user id** (the default extension also stores a
 * `label`, which we drop). The display label is resolved at render time — see
 * `renderCommentHtml` in `./html.ts`.
 */
export const MentionExtension = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes["id"]) {
            return {};
          }
          return { "data-id": attributes["id"] as string };
        },
      },
    };
  },
}).configure({
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
