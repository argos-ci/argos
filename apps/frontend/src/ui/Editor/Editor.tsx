import { useEffect, useRef } from "react";
import { Placeholder } from "@tiptap/extensions";
import { AllSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import {
  EditorContent,
  Extension,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { clsx } from "clsx";

import { EDITOR_PROSE_CLASS } from "./EditorContent.css";
import { LinkEditTrigger } from "./EditorLinkEdit";
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

const CollapseSelectionOnEscape = Extension.create({
  name: "collapseSelectionOnEscape",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            if (event.key !== "Escape") {
              return false;
            }
            const { selection } = view.state;
            if (selection.empty) {
              return false;
            }
            const tr = view.state.tr.setSelection(
              TextSelection.create(view.state.doc, selection.to),
            );
            view.dispatch(tr);
            event.preventDefault();
            event.stopPropagation();
            return true;
          },
        },
      }),
    ];
  },
});

export type EditorValue = JSONContent | null;

export interface EditorProps {
  defaultValue?: EditorValue;
  onChange: (value: EditorValue) => void;
  onBlur?: () => void;
  ref?: React.Ref<HTMLElement>;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
  disabled?: boolean;
}

const EDITOR_CONTENT_CLASS = clsx(
  EDITOR_PROSE_CLASS,
  "min-h-20 px-3 py-2 outline-hidden",
  // Placeholder
  "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-low [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0",
);

export function Editor(props: EditorProps) {
  const {
    defaultValue,
    onChange,
    onBlur,
    ref,
    className,
    placeholder,
    autoFocus,
    disabled,
  } = props;

  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          enableClickSelection: true,
          autolink: false,
        },
      }),
      CollapseAllSelectionDelete,
      CollapseSelectionOnEscape,
      LinkEditTrigger,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ],
    editable: !disabled,
    content: defaultValue,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: EDITOR_CONTENT_CLASS,
        ...(props["aria-label"] ? { "aria-label": props["aria-label"] } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON());
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
  });

  useEffect(() => {
    if (!editor || !ref) {
      return;
    }
    const dom = editor.view.dom as HTMLElement;
    if (typeof ref === "function") {
      ref(dom);
      return () => {
        ref(null);
      };
    }
    const refObject = ref as React.RefObject<HTMLElement | null>;
    refObject.current = dom;
    return () => {
      refObject.current = null;
    };
  }, [editor, ref]);

  return (
    <div
      data-hotkeys-disabled
      data-disabled={disabled ? "" : undefined}
      className={clsx(
        "bg-app focus-within:border-active rounded-md border text-sm",
        "data-disabled:opacity-disabled",
        className,
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
