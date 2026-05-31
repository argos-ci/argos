import { memo } from "react";

import { Editor, type EditorValue } from "./Editor";
import { type MentionUser } from "./mention";

export interface ReadOnlyEditorProps {
  content: EditorValue;
  className?: string;
  /** Users to resolve mentions against, for the hover card. */
  mentions?: MentionUser[];
}

/**
 * Renders rich-text content using the same {@link Editor} as the editable one,
 * in plain read-only mode. Sharing the component guarantees the rendering is
 * pixel-identical to the editable state (no layout shift when toggling).
 */
export const ReadOnlyEditor = memo(function ReadOnlyEditor(
  props: ReadOnlyEditorProps,
) {
  const { content, className, mentions } = props;
  if (!content) {
    return null;
  }
  return (
    <Editor
      variant="plain"
      readOnly
      defaultValue={content}
      className={className}
      mentions={mentions}
    />
  );
});
