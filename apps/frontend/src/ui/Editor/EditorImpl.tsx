import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { AllSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import {
  EditorContent,
  Extension,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { clsx } from "clsx";

import { createCommitAutolinkExtension } from "./commitAutolink";
import {
  EDITOR_BOXED_CLASS,
  EDITOR_BOXED_CONTENT_PADDING_CLASS,
  EDITOR_DEFAULT_CONTENT_HEIGHT_CLASS,
  EDITOR_PROSE_CLASS,
} from "./EditorContent.css";
import { LinkEditTrigger } from "./EditorLinkEdit";
import { EditorToolbar } from "./EditorToolbar";
import { createMentionExtension, type MentionUser } from "./mention";
import { SlashCommand } from "./slashCommand";

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

/**
 * - `boxed`: the editor is wrapped in a bordered box with a formatting toolbar
 *   (used for composing a new comment).
 * - `plain`: no border, no toolbar and no built-in padding — only the rich-text
 *   content. Renders identically whether read-only or editable, so toggling
 *   between the two causes no layout shift.
 */
export type EditorVariant = "boxed" | "plain";

export interface EditorProps {
  /** Initial content for an uncontrolled editor. Read once, at creation. */
  defaultValue?: EditorValue;
  /**
   * Controlled content: the editor re-renders to reflect changes to it. Use it
   * for read-only rendering that must stay in sync with its source (e.g. a
   * comment edited live over the subscription). Seeds the initial content, so
   * use it instead of — not together with — `defaultValue`.
   */
  value?: EditorValue;
  onChange?: (value: EditorValue) => void;
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
  /** Visual style of the editor. Defaults to `boxed`. */
  variant?: EditorVariant;
  /** Render the content without allowing edits. */
  readOnly?: boolean;
  /**
   * Users that can be mentioned with `@` (the autocomplete suggestions). When
   * omitted, typing `@` shows no suggestions. Read lazily, so it can change
   * without recreating the editor.
   */
  mentions?: MentionUser[];
  /**
   * Users to resolve existing mention nodes against for rendering (their label,
   * avatar and role). Mentions store only an id, so this is what turns them
   * into "@name" + a hover card. Falls back to the `mentions` list.
   */
  mentionedUsers?: MentionUser[];
  /**
   * Web URL of the repository the content is about (e.g.
   * `https://github.com/argos-ci/argos`). Commit shas in the content are linked
   * to it when rendering read-only; without it they stay plain text. Read
   * lazily, so it can change without recreating the editor.
   */
  repositoryUrl?: string | null;
}

/**
 * Hard cap on the number of characters a comment can contain. This protects the
 * UX (no pathologically large comments) and mirrors the server-side limit. It's
 * enforced silently — there's no character-count UI.
 */
const MAX_COMMENT_CHARACTERS = 2_000;

const EDITOR_CONTENT_CLASS = clsx(
  EDITOR_PROSE_CLASS,
  "outline-hidden",
  // Placeholder
  "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-placeholder [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0",
);

export default function Editor(props: EditorProps) {
  const {
    defaultValue,
    value,
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
    variant = "boxed",
    readOnly = false,
    mentions,
    mentionedUsers,
    repositoryUrl,
  } = props;

  const isBoxed = variant === "boxed";
  const editable = !disabled && !readOnly;

  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onSubmitRef = useRef(onSubmit);
  // Read lazily by the mention suggestion/resolution so the lists can update
  // without recreating the editor. Same for the repository the commit autolink
  // resolves shas against.
  const mentionsRef = useRef(mentions);
  const mentionedUsersRef = useRef(mentionedUsers);
  const repositoryUrlRef = useRef(repositoryUrl);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
    onSubmitRef.current = onSubmit;
    mentionsRef.current = mentions;
    mentionedUsersRef.current = mentionedUsers;
    repositoryUrlRef.current = repositoryUrl;
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
      CharacterCount.configure({ limit: MAX_COMMENT_CHARACTERS }),
      CollapseAllSelectionDelete,
      CollapseSelectionOnEscape,
      LinkEditTrigger,
      // The getters are invoked lazily by the suggestion plugin and node views,
      // never during this render, so reading the refs here is safe.
      /* oxlint-disable react/react-compiler */
      createMentionExtension({
        getSuggestions: () => mentionsRef.current ?? [],
        resolveUser: (id) =>
          mentionedUsersRef.current?.find((user) => user.id === id) ??
          mentionsRef.current?.find((user) => user.id === id),
      }),
      createCommitAutolinkExtension({
        getRepositoryUrl: () => repositoryUrlRef.current,
      }),
      /* oxlint-enable react/react-compiler */
      SlashCommand,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ],
    editable,
    content: value ?? defaultValue,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: clsx(
          EDITOR_CONTENT_CLASS,
          isBoxed && EDITOR_BOXED_CONTENT_PADDING_CLASS,
          isBoxed
            ? (contentClassName ?? EDITOR_DEFAULT_CONTENT_HEIGHT_CLASS)
            : contentClassName,
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
      onChangeRef.current?.(editor.getJSON());
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
  });

  // `useEditor` hands back the instance before `EditorContent` has mounted it,
  // and until the view exists the editor has no commands and no DOM node —
  // reading either throws. `isInitialized` flips once the view is created (the
  // `create` event), so anything that needs a live editor (the toolbar, the
  // `ref` forwarding) waits for `mountedEditor` rather than for `editor`.
  const isMounted = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        if (!editor) {
          return () => {};
        }
        editor.on("create", onStoreChange);
        return () => {
          editor.off("create", onStoreChange);
        };
      },
      [editor],
    ),
    () => Boolean(editor?.isInitialized),
  );
  const mountedEditor = isMounted ? editor : null;

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  // Keep the editor in sync with the controlled `value` — `useEditor` only
  // seeds `content` once at creation, so a live update (e.g. a comment edited
  // by someone else over the subscription) would otherwise render stale text.
  // `value`'s identity only changes when the content does (Apollo shares
  // references for unchanged data), so this stays a no-op on unrelated renders.
  useEffect(() => {
    // Guard against a destroyed instance: when this editor is mounted somewhere
    // that remounts it (e.g. an inline diff comment annotation, or React strict
    // mode), `useEditor` can briefly hand back a torn-down editor whose
    // `commandManager` is null, so `editor.commands` would throw.
    if (editor && !editor.isDestroyed && value != null) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!mountedEditor || !ref) {
      return;
    }
    const dom = mountedEditor.view.dom as HTMLElement;
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
  }, [mountedEditor, ref]);

  const handleContainerMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!editor || editor.isDestroyed || !editable) {
      return;
    }
    // Only handle primary-button clicks (avoid interfering with context menus).
    if (event.button !== 0 || event.ctrlKey) {
      return;
    }

    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const target = event.target;
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
      // Only swallow build hotkeys while the editor is interactive. Read-only
      // content (e.g. rendered comments) must not disable page shortcuts.
      data-hotkeys-disabled={readOnly ? undefined : ""}
      data-disabled={disabled ? "" : undefined}
      onMouseDown={isBoxed ? handleContainerMouseDown : undefined}
      className={clsx(
        isBoxed && [
          EDITOR_BOXED_CLASS,
          "data-disabled:opacity-disabled",
          editable && "cursor-text",
        ],
        className,
      )}
    >
      {isBoxed ? <EditorToolbar editor={mountedEditor} /> : null}
      <EditorContent editor={editor} />
      {footer}
    </div>
  );
}
