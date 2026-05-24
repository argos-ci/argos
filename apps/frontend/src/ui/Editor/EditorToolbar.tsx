import { useEffect, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
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
import { IconButton } from "@/ui/IconButton";

import { AnimatedBubbleMenu } from "./AnimatedBubbleMenu";
import { ALT, isMacOS, LINK_KEYS, MOD, SHIFT } from "./EditorToolbar.shortcuts";
import type { ToolbarState } from "./EditorToolbar.types";
import { EditorToolbarLinkInput } from "./EditorToolbarLinkInput";
import { HeadingMenu } from "./HeadingMenu";
import { ListMenu } from "./ListMenu";
import { MarkButton } from "./MarkButton";

export interface EditorToolbarProps {
  editor: Editor | null;
}

const BUBBLE_MENU_ANIMATION_DURATION_MS = 100;
const BUBBLE_MENU_ANIMATION_CLASS_NAME = clsx(
  "origin-bottom fill-mode-forwards duration-100",
  "data-[toolbar-animation=enter]:animate-in data-[toolbar-animation=enter]:fade-in",
  "data-[toolbar-animation=exit]:animate-out data-[toolbar-animation=exit]:fade-out data-[toolbar-animation=exit]:zoom-out-95",
);

export function EditorToolbar(props: EditorToolbarProps) {
  const { editor } = props;
  const state = useEditorState({
    editor,
    selector: ({ editor }): ToolbarState | null => {
      if (!editor) {
        return null;
      }
      const { selection } = editor.state;
      return {
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
        canBulletList: editor.can().toggleBulletList(),
        isOrderedList: editor.isActive("orderedList"),
        canOrderedList: editor.can().toggleOrderedList(),
        headingLevel:
          ([1, 2, 3, 4, 5, 6] as const).find((level) =>
            editor.isActive("heading", { level }),
          ) ?? null,
        selectionFrom: selection.from,
        selectionTo: selection.to,
        selectionEmpty: selection.empty,
      };
    },
  });

  const [linkEditing, setLinkEditing] = useState(false);
  const [prevSelectionKey, setPrevSelectionKey] = useState<string | null>(null);

  const currentSelectionKey = state
    ? `${state.selectionFrom}-${state.selectionTo}`
    : null;
  if (state && currentSelectionKey !== prevSelectionKey) {
    setPrevSelectionKey(currentSelectionKey);
    if (!state.isLink && linkEditing) {
      setLinkEditing(false);
    }
  }

  useEffect(() => {
    if (!editor) {
      return;
    }
    const dom = editor.view.dom;
    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const link = target.closest("a");
      if (link && dom.contains(link)) {
        setLinkEditing(true);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key.toLowerCase() !== "k") {
        return;
      }
      const usingMod = isMacOS ? event.metaKey : event.ctrlKey;
      if (!usingMod || event.altKey || event.shiftKey) {
        return;
      }
      if (!canEditLink(editor)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setLinkEditing(true);
    };
    dom.addEventListener("click", handleClick);
    dom.addEventListener("keydown", handleKeyDown, true);
    return () => {
      dom.removeEventListener("click", handleClick);
      dom.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor]);

  if (!editor || !state) {
    return null;
  }

  const showLinkInput = linkEditing;

  return (
    <AnimatedBubbleMenu
      editor={editor}
      className={clsx(
        BUBBLE_MENU_ANIMATION_CLASS_NAME,
        "bg-subtle border-thin z-50 flex items-center gap-0.5 rounded-lg bg-clip-padding p-1 shadow-sm",
      )}
      animationDurationMs={BUBBLE_MENU_ANIMATION_DURATION_MS}
      shouldShow={({ editor, state: pmState, from, to }) => {
        if (!editor.isEditable) {
          return false;
        }
        const hasTextInSelection = pmState.doc.textBetween(from, to).length > 0;
        if (!hasTextInSelection) {
          return editor.isActive("link");
        }
        return true;
      }}
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
}

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
        isDisabled={!state.canBold}
        onPress={(chain) => chain.toggleBold()}
      />
      <MarkButton
        editor={editor}
        label="Italic"
        keys={[MOD, "I"]}
        icon={<ItalicIcon />}
        isActive={state.isItalic}
        isDisabled={!state.canItalic}
        onPress={(chain) => chain.toggleItalic()}
      />
      <MarkButton
        editor={editor}
        label="Strikethrough"
        keys={[MOD, SHIFT, "S"]}
        icon={<StrikethroughIcon />}
        isActive={state.isStrike}
        isDisabled={!state.canStrike}
        onPress={(chain) => chain.toggleStrike()}
      />
      <MarkButton
        editor={editor}
        label="Underline"
        keys={[MOD, "U"]}
        icon={<UnderlineIcon />}
        isActive={state.isUnderline}
        isDisabled={!state.canUnderline}
        onPress={(chain) => chain.toggleUnderline()}
      />
      <LinkButton state={state} onEnterLinkMode={onEnterLinkMode} />
      <MarkButton
        editor={editor}
        label="Quote"
        keys={[MOD, SHIFT, "B"]}
        icon={<QuoteIcon />}
        isActive={state.isBlockquote}
        isDisabled={!state.canBlockquote}
        onPress={(chain) => chain.toggleBlockquote()}
      />
      <MarkButton
        editor={editor}
        label="Code"
        keys={[MOD, "E"]}
        icon={<CodeIcon />}
        isActive={state.isCode}
        isDisabled={!state.canCode}
        onPress={(chain) => chain.toggleCode()}
      />
      <MarkButton
        editor={editor}
        label="Code block"
        keys={[MOD, ALT, "C"]}
        icon={<SquareCodeIcon />}
        isActive={state.isCodeBlock}
        isDisabled={!state.canCodeBlock}
        onPress={(chain) => chain.toggleCodeBlock()}
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
      <IconButton
        size="small"
        aria-label="Link"
        aria-pressed={state.isLink}
        isDisabled={!state.isLink && !state.canSetLink}
        onPress={onEnterLinkMode}
      >
        <LinkIcon />
      </IconButton>
    </HotkeyTooltip>
  );
}

function canEditLink(editor: Editor) {
  const { selection } = editor.state;
  return (
    editor.isActive("link") ||
    (!selection.empty && editor.can().setLink({ href: "" }))
  );
}
