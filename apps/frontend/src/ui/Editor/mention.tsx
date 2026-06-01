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
 * A user that can be mentioned in a comment. `id` is the public account id —
 * the only thing the mention node persists. `label` is resolved at render time
 * (from the suggestion list or the comment's mentioned users) and shown after
 * the `@`, so a user's name never goes stale in stored content.
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

/** Label rendered after `@` when a mention's user can't be resolved. */
const UNKNOWN_MENTION_LABEL = "unknown";

export interface MentionExtensionOptions {
  /** Suggestions shown in the `@` autocomplete (the mentionable users). */
  getSuggestions: () => MentionUser[];
  /**
   * Resolve a mention node's stored id to the user to render. Mentions persist
   * only the id, so the label/avatar/role are looked up here at render time.
   */
  resolveUser: (id: string) => MentionUser | undefined;
}

/**
 * Build the TipTap Mention extension. The node persists only the user `id`;
 * everything shown (the `@label` and the hover card) is resolved at render
 * time via {@link MentionExtensionOptions.resolveUser}.
 *
 * The node spec MUST match the backend (`apps/backend/src/comment/schema.ts`)
 * so the server accepts the `mention` nodes this produces. Only the interactive
 * `suggestion` lives here.
 *
 * The getters are read lazily so the extension can be created once while the
 * underlying lists stay up to date.
 */
export function createMentionExtension(options: MentionExtensionOptions) {
  const { getSuggestions, resolveUser } = options;
  /**
   * Node view that resolves the stored id to a user and renders the `@label`,
   * wrapping it with a hover card (avatar, name, role) when resolved. Falls
   * back to "@unknown" when the user can't be resolved.
   */
  function MentionNodeView(props: NodeViewProps) {
    const id = (props.node.attrs.id as string | null) ?? null;
    const user = id ? resolveUser(id) : undefined;
    const trigger = (
      <span contentEditable={false} className="cursor-default">
        @{user?.label ?? UNKNOWN_MENTION_LABEL}
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
        filterMentionUsers(getSuggestions(), query),
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
    // Persist only the user id. The default Mention extension also stores a
    // `label`, but the name is resolved at render time so it never goes stale.
    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-id"),
          renderHTML: (attributes) => {
            if (!attributes["id"]) {
              return {};
            }
            return { "data-id": attributes["id"] as string };
          },
        },
      };
    },
    addNodeView() {
      return ReactNodeViewRenderer(MentionNodeView);
    },
  });
}
