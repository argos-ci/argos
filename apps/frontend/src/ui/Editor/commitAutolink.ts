import { findCommitShas } from "@argos/util/git";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";

/**
 * Marks that mean a piece of text must be left exactly as written: `code` is an
 * explicit "render this literally", and `link` already points somewhere.
 */
const OPAQUE_MARKS = new Set(["code", "link"]);

/**
 * Wrap every commit sha in the document in a link to its commit on the
 * repository host.
 *
 * Decorations, not marks: the stored document keeps the plain text its author
 * typed, and the link is recomputed from the repository the project points at
 * today — a project moved to another repository relinks its whole history of
 * comments, and nothing has to be migrated.
 */
function buildDecorations(
  doc: ProseMirrorNode,
  repositoryUrl: string,
): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    // A code block is verbatim by definition — don't look inside it.
    if (node.type.spec.code) {
      return false;
    }
    if (!node.isText || !node.text) {
      return true;
    }
    if (node.marks.some((mark) => OPAQUE_MARKS.has(mark.type.name))) {
      return true;
    }
    for (const { sha, index } of findCommitShas(node.text)) {
      decorations.push(
        Decoration.inline(pos + index, pos + index + sha.length, {
          nodeName: "a",
          href: `${repositoryUrl}/commit/${sha}`,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        }),
      );
    }
    return true;
  });
  return DecorationSet.create(doc, decorations);
}

export interface CommitAutolinkOptions {
  /**
   * Web URL of the repository the content is about (e.g.
   * `https://github.com/argos-ci/argos`), or null when the project has none or
   * the viewer may not know of it. Read lazily, so it can change without
   * recreating the editor.
   */
  getRepositoryUrl: () => string | null | undefined;
}

/**
 * Autolink commit shas found in the content, the way a code host does it.
 *
 * Only applies while the editor is **not** editable: an author typing a sha
 * wants the characters, not a link they can't click — inside `contenteditable`
 * a click on a link opens the link editor (`EditorLinkEdit`) instead of
 * following it. The rendered comment is where the link earns its place.
 * Detection is a shape heuristic — see `findCommitShas`.
 */
export function createCommitAutolinkExtension(options: CommitAutolinkOptions) {
  const { getRepositoryUrl } = options;
  return Extension.create({
    name: "commitAutolink",
    addProseMirrorPlugins() {
      const { editor } = this;
      return [
        new Plugin({
          props: {
            decorations: (state) => {
              if (editor.isEditable) {
                return null;
              }
              const repositoryUrl = getRepositoryUrl();
              if (!repositoryUrl) {
                return null;
              }
              return buildDecorations(state.doc, repositoryUrl);
            },
          },
        }),
      ];
    },
  });
}
