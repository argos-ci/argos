import { getSchema } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import type { Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

/**
 * Fallback label rendered for a mention whose user can't be resolved (e.g. a
 * deleted account). Mirrors the frontend's "@unknown" fallback.
 */
const UNKNOWN_MENTION_LABEL = "unknown";

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
const MentionExtension = Mention.extend({
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
 * Get the editor extensions with optional configuration.
 */
export function getExtensions(options?: {
  mentionLabels?: Map<string, string>;
}) {
  const mentionLabels = options?.mentionLabels;
  const mention = mentionLabels
    ? MentionExtension.configure({
        renderHTML: ({ options, node }) => {
          const id =
            typeof node.attrs["id"] === "string" ? node.attrs["id"] : null;
          const label =
            (id ? mentionLabels?.get(id) : null) ?? UNKNOWN_MENTION_LABEL;
          return ["span", options.HTMLAttributes, `@${label}`];
        },
      })
    : MentionExtension;

  return [StarterKit, mention];
}

/**
 * TipTap extensions used by the comment editor. Must stay in sync with the
 * frontend editor so the backend reads/writes the same node and mark types
 * (paragraphs, lists, headings, marks, links, mentions, ...) the client
 * produced.
 */
const extensions = [StarterKit, MentionExtension];

/**
 * ProseMirror schema derived from the comment extensions. Reused for HTML
 * rendering and JSON validation so both paths agree on what's allowed.
 */
export const schema: Schema = getSchema(extensions);
