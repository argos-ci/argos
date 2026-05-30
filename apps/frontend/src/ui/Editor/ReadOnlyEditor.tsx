import { memo } from "react";

import { Editor, type EditorValue } from "./Editor";

export interface ReadOnlyEditorProps {
  content: EditorValue;
  className?: string;
}

/**
 * Renders rich-text content using the same {@link Editor} as the editable one,
 * in plain read-only mode. Sharing the component guarantees the rendering is
 * pixel-identical to the editable state (no layout shift when toggling).
 */
export const ReadOnlyEditor = memo(function ReadOnlyEditor(
  props: ReadOnlyEditorProps,
) {
  const { content, className } = props;
  if (!content) {
    return null;
  }
  return (
    <Editor
      variant="plain"
      readOnly
      defaultValue={content}
      className={className}
    />
  );
});
