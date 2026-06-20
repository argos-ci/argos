import { forwardRef, useImperativeHandle, useState } from "react";
import { PluginKey } from "@tiptap/pm/state";
import {
  Extension,
  ReactRenderer,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { clsx } from "clsx";
import {
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  SquareCodeIcon,
  type LucideIcon,
} from "lucide-react";

import { Kbd } from "@/ui/Kbd";

import { ALT, MOD, SHIFT } from "./EditorToolbar.shortcuts";

/** Range of the document the slash trigger spans (`/query`), to be replaced. */
interface SlashRange {
  from: number;
  to: number;
}

/**
 * A block that can be inserted from the `/` command menu. Mirrors the
 * block-level actions already available in the editor toolbar — slash commands
 * are just a second way to reach them, so no new node types are introduced.
 */
interface SlashCommandItem {
  /** Stable identifier, used as the React key. */
  id: string;
  /** Label shown in the menu. */
  title: string;
  icon: LucideIcon;
  /** Keyboard shortcut shown on the right, matching the toolbar. */
  keys: string[];
  /** Extra terms matched against the query (besides the title). */
  keywords?: string[];
  /** Apply the block, replacing the `/query` range that triggered the menu. */
  run: (params: { editor: TiptapEditor; range: SlashRange }) => void;
}

const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    id: "heading1",
    title: "Heading 1",
    icon: Heading1Icon,
    keys: [MOD, ALT, "1"],
    keywords: ["title", "h1"],
    run: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run(),
  },
  {
    id: "heading2",
    title: "Heading 2",
    icon: Heading2Icon,
    keys: [MOD, ALT, "2"],
    keywords: ["subtitle", "h2"],
    run: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run(),
  },
  {
    id: "heading3",
    title: "Heading 3",
    icon: Heading3Icon,
    keys: [MOD, ALT, "3"],
    keywords: ["h3"],
    run: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run(),
  },
  {
    id: "bulletList",
    title: "Bulleted list",
    icon: ListIcon,
    keys: [MOD, SHIFT, "8"],
    keywords: ["unordered", "ul"],
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "orderedList",
    title: "Numbered list",
    icon: ListOrderedIcon,
    keys: [MOD, SHIFT, "7"],
    keywords: ["ordered", "ol"],
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: "codeBlock",
    title: "Code block",
    icon: SquareCodeIcon,
    keys: [MOD, ALT, "C"],
    keywords: ["pre", "snippet"],
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: "blockquote",
    title: "Blockquote",
    icon: QuoteIcon,
    keys: [MOD, SHIFT, "B"],
    keywords: ["quote", "citation"],
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
];

const MAX_SUGGESTIONS = SLASH_COMMAND_ITEMS.length;

function filterCommandItems(query: string): SlashCommandItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SLASH_COMMAND_ITEMS;
  }
  return SLASH_COMMAND_ITEMS.filter((item) => {
    return (
      item.title.toLowerCase().includes(normalized) ||
      item.keywords?.some((keyword) => keyword.includes(normalized))
    );
  }).slice(0, MAX_SUGGESTIONS);
}

interface SlashCommandListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const SlashCommandList = forwardRef<
  SlashCommandListHandle,
  {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
  }
>(function SlashCommandList(props, ref) {
  const { items, command } = props;
  // Keyed by the items array so the highlight resets whenever the filtered
  // result set changes (typing narrows the list), without an effect.
  const [selectedIndexMap, setSelectedIndexMap] = useState<
    WeakMap<SlashCommandItem[], number>
  >(new WeakMap());
  const selectedIndex = selectedIndexMap.get(items) ?? 0;
  const setSelectedIndex = (
    fnOrValue: ((index: number) => number) | number,
  ) => {
    setSelectedIndexMap((weakmap) => {
      const index = weakmap.get(items) ?? 0;
      const nextIndex =
        typeof fnOrValue === "number" ? fnOrValue : fnOrValue(index);
      const nextWeakmap = new WeakMap<SlashCommandItem[], number>();
      return nextWeakmap.set(items, nextIndex);
    });
  };

  const select = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) {
        return false;
      }
      switch (event.key) {
        case "ArrowUp":
          setSelectedIndex(
            (index) => (index + items.length - 1) % items.length,
          );
          return true;
        case "ArrowDown":
          setSelectedIndex((index) => (index + 1) % items.length);
          return true;
        case "Enter":
        case "Tab":
          select(selectedIndex);
          return true;
        default:
          return false;
      }
    },
  }));

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-app border-thin max-h-72 w-64 overflow-auto rounded-md p-1 text-sm shadow-lg">
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          className={clsx(
            "flex w-full items-center gap-2 rounded px-2 py-1 text-left",
            index === selectedIndex ? "bg-active" : "hover:bg-hover",
          )}
          // Keep keyboard and pointer selection in sync.
          onMouseEnter={() => setSelectedIndex(index)}
          // `mousedown` (not click) so the editor doesn't lose focus first.
          onMouseDown={(event) => {
            event.preventDefault();
            select(index);
          }}
        >
          <item.icon className="text-low size-4 shrink-0" />
          <span className="text-default flex-1 truncate">{item.title}</span>
          <span className="flex shrink-0 items-center">
            {item.keys.map((key) => (
              <Kbd key={key} className="ml-0.5">
                {key}
              </Kbd>
            ))}
          </span>
        </button>
      ))}
    </div>
  );
});

/**
 * Position a floating element just below the caret rect provided by the
 * suggestion plugin. Hides the element when the rect is missing.
 */
function positionPopup(
  popup: HTMLElement,
  getRect: SuggestionProps<SlashCommandItem>["clientRect"],
) {
  const rect = getRect?.();
  if (!rect) {
    popup.style.display = "none";
    return;
  }
  popup.style.display = "block";
  popup.style.position = "fixed";
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 4}px`;
  // Keep the menu above every overlay so it stays visible and clickable when the
  // editor is rendered inside one (e.g. the review submission popover). The popup
  // is appended to `document.body`, and react-aria gives its popovers/modals an
  // inline `z-index: 100000`, so this must clear that layer.
  popup.style.zIndex = "300000";
}

/** Dedicated key so this plugin never collides with the mention suggestion. */
const SlashCommandPluginKey = new PluginKey("slashCommand");

/**
 * `/` command menu. Typing `/` opens a popup listing the block-level actions
 * already exposed in the toolbar (headings, lists, code block, blockquote);
 * selecting one replaces the `/query` and applies the block.
 *
 * Built on `@tiptap/suggestion`, mirroring the mention extension's popup
 * rendering. It introduces no new node types, so the backend schema is
 * unaffected.
 */
export const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        pluginKey: SlashCommandPluginKey,
        char: "/",
        // Only trigger at the start of an empty-ish line, matching the
        // Notion/GitBook convention (and avoiding mid-sentence false hits).
        allowSpaces: false,
        startOfLine: true,
        items: ({ query }) => filterCommandItems(query),
        command: ({ editor, range, props }) => {
          props.run({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashCommandListHandle> | null = null;
          let popup: HTMLDivElement | null = null;

          const destroy = () => {
            popup?.remove();
            component?.destroy();
            popup = null;
            component = null;
          };

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });
              popup = document.createElement("div");
              // Mark as a top layer so react-aria's interact-outside ignores
              // clicks on it — otherwise selecting a command inside a dialog or
              // popover would dismiss that overlay. Also keeps it visible to
              // screen readers (excluded from the modal's `aria-hidden`).
              popup.setAttribute("data-react-aria-top-layer", "true");
              popup.append(component.element);
              document.body.append(popup);
              positionPopup(popup, props.clientRect);
            },
            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              component?.updateProps(props);
              if (popup) {
                positionPopup(popup, props.clientRect);
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                destroy();
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: destroy,
          };
        },
      }),
    ];
  },
});
