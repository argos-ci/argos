import { memo } from "react";

import { Editor, type EditorValue } from "./Editor";
import { type MentionUser } from "./mention";

export interface ReadOnlyEditorProps {
  content: EditorValue;
  className?: string;
  /**
   * Users to resolve the content's mentions against (their label, avatar and
   * role). Mentions store only an id, so this is what renders "@name" and the
   * hover card.
   */
  mentionedUsers?: MentionUser[];
  /**
   * Web URL of the repository the content is about. Commit shas in the content
   * are linked to it; without it they stay plain text.
   */
  repositoryUrl?: string | null;
}

/**
 * Renders rich-text content using the same {@link Editor} as the editable one,
 * in plain read-only mode. Sharing the component guarantees the rendering is
 * pixel-identical to the editable state (no layout shift when toggling).
 */
export const ReadOnlyEditor = memo(function ReadOnlyEditor(
  props: ReadOnlyEditorProps,
) {
  const { content, className, mentionedUsers, repositoryUrl } = props;
  if (!content) {
    return null;
  }
  return (
    <Editor
      variant="plain"
      readOnly
      value={content}
      className={className}
      mentionedUsers={mentionedUsers}
      repositoryUrl={repositoryUrl}
    />
  );
});
