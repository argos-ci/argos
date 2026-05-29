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
  /** Called when the user presses Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
  /** Content rendered inside the editor box, below the text area. */
  footer?: React.ReactNode;
  ref?: React.Ref<HTMLElement>;
  className?: string;
  /** Class applied to the editable text area (e.g. to override its height). */
  contentClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
  disabled?: boolean;
}

const EDITOR_CONTENT_CLASS = clsx(
  EDITOR_PROSE_CLASS,
  "px-3 py-2 outline-hidden",
  // Placeholder
  "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-low [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0",
);

const DEFAULT_CONTENT_HEIGHT_CLASS = "min-h-20";

export function Editor(props: EditorProps) {
  const {
    defaultValue,
    onChange,
    onBlur,
    onSubmit,
    footer,
    ref,
    className,
    contentClassName,
    placeholder,
    autoFocus,
    disabled,
  } = props;

  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
    onSubmitRef.current = onSubmit;
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
        class: clsx(
          EDITOR_CONTENT_CLASS,
          contentClassName ?? DEFAULT_CONTENT_HEIGHT_CLASS,
        ),
        ...(props["aria-label"] ? { "aria-label": props["aria-label"] } : {}),
      },
      handleKeyDown: (_view, event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key === "Enter" &&
          onSubmitRef.current
        ) {
          event.preventDefault();
          onSubmitRef.current();
          return true;
        }
        return false;
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
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

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

  const handleContainerMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!editor || disabled) {
      return;
    }
    const target = event.target as HTMLElement;
    // Let ProseMirror place the cursor for clicks inside the editable content,
    // and let interactive controls (toolbar, footer button, links) behave
    // normally.
    if (
      editor.view.dom.contains(target) ||
      target.closest("button, a, input, textarea")
    ) {
      return;
    }
    // Clicking the surrounding chrome (padding, footer) focuses the field
    // instead of blurring it.
    event.preventDefault();
    editor.commands.focus("end");
  };

  return (
    <div
      data-hotkeys-disabled
      data-disabled={disabled ? "" : undefined}
      onMouseDown={handleContainerMouseDown}
      className={clsx(
        "bg-app focus-within:border-active rounded-md border text-sm",
        "data-disabled:opacity-disabled",
        !disabled && "cursor-text",
        className,
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      {footer}
    </div>
  );
}
