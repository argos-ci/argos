import { useEffect, useRef } from "react";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { clsx } from "clsx";

import { EditorToolbar } from "./EditorToolbar";

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
  "min-h-20 px-3 py-2 outline-hidden",
  // Paragraphs
  "[&_p]:my-0 [&_p+p]:mt-2",
  // Headings
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h1:first-child]:mt-0",
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2:first-child]:mt-0",
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3:first-child]:mt-0",
  "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1 [&_h4:first-child]:mt-0",
  "[&_h5]:text-sm [&_h5]:font-semibold [&_h5]:mt-1 [&_h5]:mb-1",
  "[&_h6]:text-xs [&_h6]:font-semibold [&_h6]:mt-1 [&_h6]:mb-1",
  // Lists
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
  "[&_li]:my-0.5 [&_li_p]:my-0",
  // Blockquote
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-low [&_blockquote]:my-2",
  // Inline code
  "[&_code]:bg-hover [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono",
  // Code block
  "[&_pre]:bg-ui [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:font-mono [&_pre]:text-xs",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[1em]",
  // Horizontal rule
  "[&_hr]:my-3 [&_hr]:border-t",
  // Links
  "[&_a]:text-primary-low [&_a]:underline [&_a]:underline-offset-2",
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
