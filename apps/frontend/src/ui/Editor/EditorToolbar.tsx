import { memo, useCallback, useEffect, useState } from "react";
import type { EditorState } from "@tiptap/pm/state";
import {
  useEditorState,
  type Editor,
  type EditorStateSnapshot,
} from "@tiptap/react";
import { clsx } from "clsx";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  QuoteIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { ALT, MOD, SHIFT } from "@/util/os";

import { Button } from "../Button";
import { AnimatedBubbleMenu } from "./AnimatedBubbleMenu";
import { LINK_EDIT_TRIGGER_EVENT } from "./EditorLinkEdit";
import type { ToolbarState } from "./EditorToolbar.types";
import { EditorToolbarLinkInput } from "./EditorToolbarLinkInput";
import { HeadingMenu } from "./HeadingMenu";
import { ListMenu } from "./ListMenu";
import { MarkButton } from "./MarkButton";

export interface EditorToolbarProps {
  /**
   * The editor to act on, or null while there is none to act on yet. Must be
   * mounted: the toolbar reads commands and the editor's DOM node, neither of
   * which exists before the view is created (see `Editor`).
   */
  editor: Editor | null;
}

const LINK_KEYS = [MOD, "K"];

const BUBBLE_MENU_ANIMATION_DURATION_MS = 100;
const BUBBLE_MENU_ANIMATION_CLASS_NAME = clsx(
  "origin-bottom fill-mode-forwards duration-100",
  "data-[toolbar-animation=enter]:animate-in data-[toolbar-animation=enter]:fade-in",
  "data-[toolbar-animation=exit]:animate-out data-[toolbar-animation=exit]:fade-out data-[toolbar-animation=exit]:zoom-out-95",
);

/**
 * Over a selection that holds text, or on a link. Module-level because
 * `BubbleMenu` dispatches a transaction whenever `shouldShow` changes identity.
 */
function shouldShowToolbar(props: {
  editor: Editor;
  state: EditorState;
  from: number;
  to: number;
}): boolean {
  const { editor, state, from, to } = props;
  if (!editor.isEditable) {
    return false;
  }
  return state.doc.textBetween(from, to).length > 0 || editor.isActive("link");
}

/**
 * The selector runs on every transaction. While the toolbar is hidden it
 * returns the state it last read: that skips eight `can()` dry runs and a
 * re-render per keystroke, and a toolbar fading out keeps its buttons.
 */
const lastReadStates = new WeakMap<Editor, ToolbarState>();

// Memoized because the editor around it re-renders on every keystroke, and the
// toolbar has its own subscription to the editor.
export const EditorToolbar = memo(function EditorToolbar(
  props: EditorToolbarProps,
) {
  const { editor } = props;
  const selector = useCallback(
    ({
      editor: snapshotEditor,
    }: EditorStateSnapshot<Editor | null>): ToolbarState | null => {
      // `useEditorState` keeps its own reference to the editor and only
      // re-points it in a layout effect, so a render that happens right after
      // the editor was torn down (`useEditor` destroys the instance a tick
      // after the effects are cleaned up, then hands back `null`) still passes
      // the previous instance to the selector. A destroyed editor keeps
      // answering `state` and `isActive()` from its cached state, but its
      // command manager is gone, so `can()` throws.
      if (snapshotEditor !== editor || !editor || editor.isDestroyed) {
        return null;
      }
      const { state: editorState } = editor;
      const { selection } = editorState;
      const lastRead = lastReadStates.get(editor);
      if (
        lastRead &&
        !shouldShowToolbar({
          editor,
          state: editorState,
          from: selection.from,
          to: selection.to,
        })
      ) {
        return lastRead;
      }
      const next: ToolbarState = {
        isBold: editor.isActive("bold"),
        canBold: editor.can().toggleBold(),
        isItalic: editor.isActive("italic"),
        canItalic: editor.can().toggleItalic(),
        isStrike: editor.isActive("strike"),
        canStrike: editor.can().toggleStrike(),
        isUnderline: editor.isActive("underline"),
        canUnderline: editor.can().toggleUnderline(),
        isCode: editor.isActive("code"),
        canCode: editor.can().toggleCode(),
        isCodeBlock: editor.isActive("codeBlock"),
        canCodeBlock: editor.can().toggleCodeBlock(),
        isBlockquote: editor.isActive("blockquote"),
        canBlockquote: editor.can().toggleBlockquote(),
        isLink: editor.isActive("link"),
        linkHref:
          (editor.getAttributes("link").href as string | undefined) ?? null,
        canSetLink: editor.can().setLink({ href: "" }),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        headingLevel:
          ([1, 2, 3, 4, 5, 6] as const).find((level) =>
            editor.isActive("heading", { level }),
          ) ?? null,
        selectionFrom: selection.from,
        selectionTo: selection.to,
        selectionEmpty: selection.empty,
      };
      lastReadStates.set(editor, next);
      return next;
    },
    [editor],
  );
  const state = useEditorState({ editor, selector });

  const [linkEditing, setLinkEditing] = useState(false);

  const currentSelectionKey = state
    ? `${state.selectionFrom}-${state.selectionTo}`
    : null;

  useEffect(() => {
    // A destroyed editor has no view — reading `view.dom` off it throws.
    if (!editor || editor.isDestroyed) {
      return;
    }
    const dom = editor.view.dom;
    const handleTrigger = () => setLinkEditing(true);
    const handleSelectionUpdate = () => {
      if (!editor.isActive("link")) {
        setLinkEditing(false);
      }
    };
    dom.addEventListener(LINK_EDIT_TRIGGER_EVENT, handleTrigger);
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      dom.removeEventListener(LINK_EDIT_TRIGGER_EVENT, handleTrigger);
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor]);

  if (!editor || !state) {
    return null;
  }

  const showLinkInput = linkEditing;

  return (
    <AnimatedBubbleMenu
      editor={editor}
      // How the editor box tells the toolbar apart from its own chrome.
      data-editor-toolbar=""
      className={clsx(
        BUBBLE_MENU_ANIMATION_CLASS_NAME,
        "bg-subtle border-thin z-50 flex items-center gap-0.5 rounded-lg bg-clip-padding p-1 shadow-sm",
      )}
      animationDurationMs={BUBBLE_MENU_ANIMATION_DURATION_MS}
      shouldShow={shouldShowToolbar}
    >
      {showLinkInput ? (
        <EditorToolbarLinkInput
          key={currentSelectionKey ?? ""}
          editor={editor}
          initialHref={state.linkHref ?? ""}
          hasLink={state.isLink}
          onDone={() => setLinkEditing(false)}
        />
      ) : (
        <FormatToolbar
          editor={editor}
          state={state}
          onEnterLinkMode={() => setLinkEditing(true)}
        />
      )}
    </AnimatedBubbleMenu>
  );
});

function FormatToolbar(props: {
  editor: Editor;
  state: ToolbarState;
  onEnterLinkMode: () => void;
}) {
  const { editor, state, onEnterLinkMode } = props;
  return (
    <>
      <HeadingMenu editor={editor} state={state} />
      <MarkButton
        editor={editor}
        label="Bold"
        keys={[MOD, "B"]}
        icon={<BoldIcon />}
        isActive={state.isBold}
        disabled={!state.canBold}
        apply={(chain) => chain.toggleBold()}
      />
      <MarkButton
        editor={editor}
        label="Italic"
        keys={[MOD, "I"]}
        icon={<ItalicIcon />}
        isActive={state.isItalic}
        disabled={!state.canItalic}
        apply={(chain) => chain.toggleItalic()}
      />
      <MarkButton
        editor={editor}
        label="Strikethrough"
        keys={[MOD, SHIFT, "S"]}
        icon={<StrikethroughIcon />}
        isActive={state.isStrike}
        disabled={!state.canStrike}
        apply={(chain) => chain.toggleStrike()}
      />
      <MarkButton
        editor={editor}
        label="Underline"
        keys={[MOD, "U"]}
        icon={<UnderlineIcon />}
        isActive={state.isUnderline}
        disabled={!state.canUnderline}
        apply={(chain) => chain.toggleUnderline()}
      />
      <LinkButton state={state} onEnterLinkMode={onEnterLinkMode} />
      <MarkButton
        editor={editor}
        label="Quote"
        keys={[MOD, SHIFT, "B"]}
        icon={<QuoteIcon />}
        isActive={state.isBlockquote}
        disabled={!state.canBlockquote}
        apply={(chain) => chain.toggleBlockquote()}
      />
      <MarkButton
        editor={editor}
        label="Code"
        keys={[MOD, "E"]}
        icon={<CodeIcon />}
        isActive={state.isCode}
        disabled={!state.canCode}
        apply={(chain) => chain.toggleCode()}
      />
      <MarkButton
        editor={editor}
        label="Code block"
        keys={[MOD, ALT, "C"]}
        icon={<SquareCodeIcon />}
        isActive={state.isCodeBlock}
        disabled={!state.canCodeBlock}
        apply={(chain) => chain.toggleCodeBlock()}
      />
      <ListMenu editor={editor} state={state} />
    </>
  );
}

function LinkButton(props: {
  state: ToolbarState;
  onEnterLinkMode: () => void;
}) {
  const { state, onEnterLinkMode } = props;
  return (
    <HotkeyTooltip description="Link" keys={LINK_KEYS}>
      <Button
        variant="ghost"
        iconOnly
        size="small"
        aria-label="Link"
        aria-pressed={state.isLink}
        disabled={!state.isLink && !state.canSetLink}
        onClick={onEnterLinkMode}
      >
        <LinkIcon />
      </Button>
    </HotkeyTooltip>
  );
}
