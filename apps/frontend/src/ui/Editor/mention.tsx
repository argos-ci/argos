import { forwardRef, useImperativeHandle, useState } from "react";
import Mention from "@tiptap/extension-mention";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  ReactRenderer,
  type NodeViewProps,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import { clsx } from "clsx";

import { UserHoverCard } from "../UserCard";

/**
 * A user that can be mentioned in a comment. `id` is the public account id
 * stored in the mention node; `label` is what's rendered after the `@`.
 */
export interface MentionUser {
  id: string;
  label: string;
  /** Secondary text shown in the suggestion list (e.g. the account slug). */
  secondaryLabel?: string | null;
  imageUrl?: string | null;
  /** Initial shown when there's no image. */
  initial?: string | null;
  /** Team role, shown in the hover card (e.g. "owner"). */
  role?: string | null;
}

const MAX_SUGGESTIONS = 8;

function filterMentionUsers(
  users: MentionUser[],
  query: string,
): MentionUser[] {
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? users.filter((user) => {
        return (
          user.label.toLowerCase().includes(normalized) ||
          user.secondaryLabel?.toLowerCase().includes(normalized)
        );
      })
    : users;
  return matches.slice(0, MAX_SUGGESTIONS);
}

/** Minimal shape of the suggestion props we use (avoids a direct dep on
 * `@tiptap/suggestion`, which isn't a direct dependency). */
interface SuggestionRenderProps {
  editor: TiptapEditor;
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
  clientRect?: (() => DOMRect | null) | null;
  event?: KeyboardEvent;
}

interface MentionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const MentionList = forwardRef<
  MentionListHandle,
  {
    items: MentionUser[];
    command: (item: { id: string; label: string }) => void;
  }
>(function MentionList(props, ref) {
  const { items, command } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Reset the highlighted row whenever the suggestions change (new query),
  // using the "adjust state during render" pattern instead of an effect.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelectedIndex(0);
  }

  const select = (index: number) => {
    const item = items[index];
    if (item) {
      command({ id: item.id, label: item.label });
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
    <div className="bg-app border-thin max-h-60 w-64 overflow-auto rounded-md p-1 text-sm shadow-lg">
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          className={clsx(
            "flex w-full items-center gap-2 rounded px-2 py-1 text-left",
            index === selectedIndex ? "bg-active" : "hover:bg-hover",
          )}
          // Use the index on hover so keyboard and pointer stay in sync.
          onMouseEnter={() => setSelectedIndex(index)}
          // `mousedown` (not click) so the editor doesn't lose focus first.
          onMouseDown={(event) => {
            event.preventDefault();
            select(index);
          }}
        >
          <MentionAvatar user={item} />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-default font-medium">{item.label}</span>
            {item.secondaryLabel ? (
              <span className="text-low ml-1 truncate">
                {item.secondaryLabel}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
});

function MentionAvatar(props: { user: MentionUser }) {
  const { user } = props;
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt=""
        className="size-5 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="bg-ui text-low flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium uppercase">
      {(user.initial || user.label || "?").slice(0, 1)}
    </span>
  );
}

/**
 * Position a floating element just below the caret rect provided by the
 * suggestion plugin. Falls back to hiding the element when the rect is missing.
 */
function positionPopup(
  popup: HTMLElement,
  getRect: SuggestionRenderProps["clientRect"],
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
  popup.style.zIndex = "50";
}

/**
 * Build the TipTap Mention extension wired to a (synchronous) list of
 * mentionable users.
 *
 * The node spec MUST match the backend (`apps/backend/src/comment/schema.ts`)
 * so the server accepts the `mention` nodes this produces. Only the interactive
 * `suggestion` lives here.
 *
 * `getUsers` is read lazily on each `@` query so the extension can be created
 * once while the underlying list stays up to date.
 */
export function createMentionExtension(getUsers: () => MentionUser[]) {
  /**
   * Node view that renders the `@label` and, when the mentioned user is in the
   * known list, wraps it with a hover card showing their avatar, name and role.
   */
  function MentionNodeView(props: NodeViewProps) {
    const id = (props.node.attrs.id as string | null) ?? null;
    const label = (props.node.attrs.label as string | null) ?? id ?? "";
    const user = id ? getUsers().find((item) => item.id === id) : undefined;
    const trigger = (
      <span contentEditable={false} className="cursor-default">
        @{label}
      </span>
    );
    return (
      <NodeViewWrapper as="span" className="mention">
        {user ? (
          <UserHoverCard
            user={{
              name: user.label,
              slug: user.secondaryLabel ?? user.label,
              imageUrl: user.imageUrl,
              initial: user.initial,
              role: user.role,
            }}
          >
            {trigger}
          </UserHoverCard>
        ) : (
          trigger
        )}
      </NodeViewWrapper>
    );
  }

  return Mention.configure({
    HTMLAttributes: { class: "mention" },
    suggestion: {
      char: "@",
      items: ({ query }: { query: string }) =>
        filterMentionUsers(getUsers(), query),
      render: () => {
        let component: ReactRenderer<MentionListHandle> | null = null;
        let popup: HTMLDivElement | null = null;

        return {
          onStart: (props: SuggestionRenderProps) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });
            popup = document.createElement("div");
            popup.append(component.element);
            document.body.append(popup);
            positionPopup(popup, props.clientRect);
          },
          onUpdate: (props: SuggestionRenderProps) => {
            component?.updateProps(props);
            if (popup) {
              positionPopup(popup, props.clientRect);
            }
          },
          onKeyDown: (props: { event: KeyboardEvent }) => {
            if (props.event.key === "Escape") {
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
              return true;
            }
            return component?.ref?.onKeyDown(props.event) ?? false;
          },
          onExit: () => {
            popup?.remove();
            component?.destroy();
            popup = null;
            component = null;
          },
        };
      },
    },
  }).extend({
    addNodeView() {
      return ReactNodeViewRenderer(MentionNodeView);
    },
  });
}
