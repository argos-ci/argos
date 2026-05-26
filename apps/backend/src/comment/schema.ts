import { getSchema } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

/**
 * TipTap extensions used by the comment editor. Must stay in sync with the
 * frontend editor so the backend reads/writes the same node and mark types
 * (paragraphs, lists, headings, marks, links, ...) the client produced.
 */
export const extensions = [StarterKit];

/**
 * ProseMirror schema derived from the comment extensions. Reused for HTML
 * rendering and JSON validation so both paths agree on what's allowed.
 */
export const schema: Schema = getSchema(extensions);
