import { useEffect, useRef } from "react";
import { Placeholder } from "@tiptap/extensions";
import { AllSelection, TextSelection } from "@tiptap/pm/state";
import {
  EditorContent,
  Extension,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { clsx } from "clsx";

import { EDITOR_PROSE_CLASS } from "./EditorContent.css";
import { EditorToolbar } from "./EditorToolbar";

const CollapseAllSelectionDelete = Extension.create({
  name: "collapseAllSelectionDelete",
  addKeyboardShortcuts() {
    const handle = () => {
      const { state, view } = this.editor;
      if (!(state.selection instanceof AllSelection)) {
        return false;
      }
      const tr = state.tr.deleteSelection();
      const pos = Math.min(1, tr.doc.content.size);
      tr.setSelection(TextSelection.create(tr.doc, pos));
      view.dispatch(tr.scrollIntoView());
      return true;
    };
    return { Backspace: handle, Delete: handle };
  },
});

export type EditorValue = JSONContent | null;

export interface EditorProps {
  value: EditorValue;
  onChange: (value: EditorValue) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
}

const EDITOR_CONTENT_CLASS = clsx(
  EDITOR_PROSE_CLASS,
  "min-h-20 px-3 py-2 outline-hidden",
  // Placeholder
  "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-low [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0",
);

export function Editor(props: EditorProps) {
  const { value, onChange, className, placeholder, autoFocus } = props;
  const lastValueRef = useRef<EditorValue>(value);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      CollapseAllSelectionDelete,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ],
    content: value,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: EDITOR_CONTENT_CLASS,
        ...(props["aria-label"] ? { "aria-label": props["aria-label"] } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      lastValueRef.current = json;
      onChange(json);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (value === lastValueRef.current) {
      return;
    }
    lastValueRef.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      data-hotkeys-disabled
      className={clsx(
        "bg-app focus-within:border-active rounded-md border text-sm",
        className,
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
