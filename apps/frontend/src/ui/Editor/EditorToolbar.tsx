import { useEffect, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { clsx } from "clsx";
import {
  BoldIcon,
  ChevronDownIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  TextQuoteIcon,
  UnderlineIcon,
} from "lucide-react";
import { Button as RACButton } from "react-aria-components";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Kbd } from "@/ui/Kbd";
import { Menu, MenuItem, MenuItemShortcut, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { EditorToolbarLinkInput } from "./EditorToolbarLinkInput";

export interface EditorToolbarProps {
  editor: Editor | null;
}

const isMacOS =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

const MOD = isMacOS ? "⌘" : "Ctrl";
const ALT = isMacOS ? "⌥" : "Alt";
const SHIFT = isMacOS ? "⇧" : "Shift";
const LINK_KEYS = [MOD, "K"];

type ToolbarState = {
  isBold: boolean;
  canBold: boolean;
  isItalic: boolean;
  canItalic: boolean;
  isStrike: boolean;
  canStrike: boolean;
  isUnderline: boolean;
  canUnderline: boolean;
  isCode: boolean;
  canCode: boolean;
  isCodeBlock: boolean;
  canCodeBlock: boolean;
  isBlockquote: boolean;
  canBlockquote: boolean;
  isLink: boolean;
  linkHref: string | null;
  canSetLink: boolean;
  isBulletList: boolean;
  canBulletList: boolean;
  isOrderedList: boolean;
  canOrderedList: boolean;
  headingLevel: number | null;
  selectionFrom: number;
  selectionTo: number;
  selectionEmpty: boolean;
};

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
    <BubbleMenu
      editor={editor}
      className={clsx(
        "bg-subtle border-thin z-50 flex items-center gap-0.5 rounded-lg bg-clip-padding p-1 shadow-sm",
      )}
      shouldShow={({ editor, state: pmState, from, to }) => {
        if (!editor.isEditable) {
          return false;
        }
        const isEmptyTextBlock =
          !pmState.doc.textBetween(from, to).length && pmState.selection.empty;
        if (isEmptyTextBlock) {
          return false;
        }
        if (!pmState.selection.empty) {
          return true;
        }
        return editor.isActive("link");
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
    </BubbleMenu>
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
        icon={<TextQuoteIcon />}
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

function MarkButton(props: {
  editor: Editor;
  label: string;
  keys: string[];
  icon: React.ReactElement;
  isActive: boolean;
  isDisabled: boolean;
  onPress: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>;
}) {
  const { editor, label, keys, icon, isActive, isDisabled, onPress } = props;
  return (
    <HotkeyTooltip description={label} keys={keys}>
      <IconButton
        size="small"
        aria-label={label}
        aria-pressed={isActive}
        isDisabled={isDisabled}
        onPress={() => onPress(editor.chain().focus()).run()}
      >
        {icon}
      </IconButton>
    </HotkeyTooltip>
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

const HEADING_OPTIONS = [
  { key: "paragraph", label: "Regular text", keys: [MOD, ALT, "0"] },
  { key: "1", label: "Heading 1", keys: [MOD, ALT, "1"] },
  { key: "2", label: "Heading 2", keys: [MOD, ALT, "2"] },
  { key: "3", label: "Heading 3", keys: [MOD, ALT, "3"] },
  { key: "4", label: "Heading 4", keys: [MOD, ALT, "4"] },
] as const;

function HeadingMenu(props: { editor: Editor; state: ToolbarState }) {
  const { editor, state } = props;
  const selectedKey = state.headingLevel
    ? String(state.headingLevel)
    : "paragraph";

  return (
    <MenuTrigger>
      <ToolbarMenuButton aria-label="Text style">
        <span className="font-medium">Aa</span>
        <ChevronDownIcon className="size-3" />
      </ToolbarMenuButton>
      <Popover>
        <Menu
          aria-label="Text style"
          selectionMode="single"
          selectedKeys={[selectedKey]}
          onAction={(key) => {
            const chain = editor.chain().focus();
            if (key === "paragraph") {
              chain.setParagraph().run();
            } else {
              const level = Number(key) as 1 | 2 | 3 | 4 | 5 | 6;
              chain.toggleHeading({ level }).run();
            }
          }}
          className="min-w-52"
        >
          {HEADING_OPTIONS.map((option) => (
            <MenuItem key={option.key} id={option.key} textValue={option.label}>
              <span className={getHeadingItemClassName(option.key)}>
                {option.label}
              </span>
              <MenuItemShortcut>
                {option.keys.map((key) => (
                  <Kbd key={key} className="ml-0.5">
                    {key}
                  </Kbd>
                ))}
              </MenuItemShortcut>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function getHeadingItemClassName(key: (typeof HEADING_OPTIONS)[number]["key"]) {
  switch (key) {
    case "1":
      return "text-xl font-bold";
    case "2":
      return "text-lg font-bold";
    case "3":
      return "text-base font-semibold";
    case "4":
      return "text-sm font-semibold";
    default:
      return "";
  }
}

const LIST_OPTIONS = [
  {
    key: "bulletList",
    label: "Bullet list",
    keys: [MOD, SHIFT, "8"],
    icon: ListIcon,
  },
  {
    key: "orderedList",
    label: "Numbered list",
    keys: [MOD, SHIFT, "7"],
    icon: ListOrderedIcon,
  },
] as const;

function ListMenu(props: { editor: Editor; state: ToolbarState }) {
  const { editor, state } = props;
  const selectedKey = state.isBulletList
    ? "bulletList"
    : state.isOrderedList
      ? "orderedList"
      : null;

  return (
    <MenuTrigger>
      <ToolbarMenuButton aria-label="Lists" aria-pressed={selectedKey !== null}>
        <ListIcon className="size-4" />
        <ChevronDownIcon className="size-3" />
      </ToolbarMenuButton>
      <Popover>
        <Menu
          aria-label="Lists"
          selectionMode="single"
          selectedKeys={selectedKey ? [selectedKey] : []}
          onAction={(key) => {
            const chain = editor.chain().focus();
            if (key === "bulletList") {
              chain.toggleBulletList().run();
            } else if (key === "orderedList") {
              chain.toggleOrderedList().run();
            }
          }}
          className="min-w-60"
        >
          {LIST_OPTIONS.map((option) => (
            <MenuItem
              key={option.key}
              id={option.key}
              textValue={option.label}
              isDisabled={
                option.key === "bulletList"
                  ? !state.canBulletList
                  : !state.canOrderedList
              }
            >
              <option.icon className="mr-2 size-4" />
              {option.label}
              <MenuItemShortcut>
                {option.keys.map((key) => (
                  <Kbd key={key} className="ml-0.5">
                    {key}
                  </Kbd>
                ))}
              </MenuItemShortcut>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function ToolbarMenuButton(
  props: React.ComponentPropsWithRef<typeof RACButton>,
) {
  return (
    <RACButton
      {...props}
      className={clsx(
        "data-hovered:border-hover text-low data-hovered:text-default data-focus-visible:ring-default data-pressed:bg-active data-pressed:text-default aria-pressed:bg-active aria-pressed:text-default aria-expanded:bg-active aria-expanded:text-default",
        "border border-transparent",
        "focus:outline-hidden data-focus-visible:ring-4",
        "flex h-6 cursor-default items-center gap-0.5 rounded-md px-1.5 text-sm font-medium",
        props.className,
      )}
    />
  );
}
