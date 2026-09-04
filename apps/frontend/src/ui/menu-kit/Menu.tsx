import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { clsx } from "clsx";
import {
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
  SearchIcon,
} from "lucide-react";

import {
  getMenuItemClassName,
  menuHeadingClassName,
  menuItemDescriptionClassName,
  menuItemIconClassName,
  menuItemSuffixClassName,
  menuListClassName,
  menuSeparatorClassName,
  menuTextClassName,
  selectedMenuItemClassName,
} from "../menuStyle";
import {
  popupAnimationClassName,
  popupExitAnimationClassName,
  popupSurfaceClassName,
  popupZIndexClassName,
} from "../popupSurface";
import { RouterLink } from "../RouterLink";
import { Shortcut } from "../Shortcut";
import { Tooltip } from "../Tooltip";
import { filterMenuNodes, pruneOrphans } from "./filter";
import {
  getMenuNodes,
  MENU_PART,
  type ItemNode,
  type MenuNode,
  type MenuPartKind,
} from "./tree";

/** Narrowest a menu shrinks to, whatever its rows measure. */
const MENU_MIN_WIDTH = 192;
/** Widest it grows before rows truncate instead. */
const MENU_MAX_WIDTH = 512;
/** Tallest the list gets before it scrolls, room permitting. */
const MENU_MAX_HEIGHT = 416;

/* -------------------------------------------------------------------------- */
/* Search state                                                               */
/* -------------------------------------------------------------------------- */

type SearchState = {
  query: string;
  setQuery: (query: string) => void;
  /** True once anything has been typed, which is what reveals a hidden field. */
  touched: boolean;
};

const SearchContext = createContext<SearchState | null>(null);

/**
 * Gives a menu its search state.
 *
 * A `Menu` mounts one of these itself when there is not one already, which is
 * what makes every menu type-to-filter without anyone opting in — and each
 * submenu mounts its own, so its query is its own too. Wrap a menu in it
 * explicitly only to control the query — to drive it from an input that lives
 * outside the popup, say.
 */
function MenuAutoComplete(props: {
  children: ReactNode;
  /** The popup's open state: the query resets each time it opens. */
  open?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const {
    children,
    open = true,
    value,
    defaultValue = "",
    onValueChange,
  } = props;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [touched, setTouched] = useState(Boolean(value ?? defaultValue));
  // A menu opens as it was born: no query, and a revealed field hidden again.
  // The state outlives the popup — the components stay mounted while it is
  // closed — so it is put back on the way in. During render, never on the way
  // out, where the closing popup would flash its unfiltered self mid-exit.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUncontrolled(defaultValue);
      setTouched(Boolean(value ?? defaultValue));
    }
  }
  const query = value ?? uncontrolled;
  const setQuery = useCallback(
    (next: string) => {
      setUncontrolled(next);
      setTouched(true);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  const state = useMemo<SearchState>(
    () => ({ query, setQuery, touched }),
    [query, setQuery, touched],
  );
  return <SearchContext value={state}>{children}</SearchContext>;
}

function useSearch(): SearchState {
  const state = use(SearchContext);
  if (!state) {
    throw new Error("Menu parts must be rendered inside a Menu");
  }
  return state;
}

/* -------------------------------------------------------------------------- */
/* Trigger and surface                                                        */
/* -------------------------------------------------------------------------- */

type MenuOpenState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /**
   * Takes the popup out of the DOM now, skipping the exit animation.
   *
   * Base UI renders a popover's dismiss layer while `open || mounted`, so a
   * closing popup keeps its Escape handler and its focus for the length of the
   * animation. When a row opens a dialog, that leaves the two overlaid, and the
   * Escape meant for the dialog closes the menu instead — the dialog stays up.
   *
   * `actionsRef.close()` does not help: it is `setOpen(false)`, which is what
   * closing the menu already does. Unmounting is the only one of the two that
   * ends the overlap. Picking a row is also the one dismissal with nothing to
   * animate away from — the pointer has already left.
   */
  unmount: () => void;
};

const MenuOpenContext = createContext<MenuOpenState | null>(null);

/**
 * Owns the open state.
 *
 * Base UI keeps it inside its own root, with no way for a descendant to close
 * the popover; a row that runs an action has to. So the state is held here and
 * handed down, and Base UI is driven from it. Submenus read it too: one state
 * for the tree is what lets a row anywhere close everything at once.
 */
export function MenuRoot(props: {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { children, open: openProp, defaultOpen = false, onOpenChange } = props;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const actionsRef = useRef<BasePopover.Root.Actions>(null);
  const unmount = useCallback(() => actionsRef.current?.unmount(), []);
  const value = useMemo(
    () => ({ open, setOpen, unmount }),
    [open, setOpen, unmount],
  );
  return (
    <MenuOpenContext value={value}>
      <BasePopover.Root
        open={open}
        onOpenChange={setOpen}
        actionsRef={actionsRef}
      >
        {children}
      </BasePopover.Root>
    </MenuOpenContext>
  );
}

/** The control that opens the menu, rendering whatever it is given. */
export function MenuTrigger(
  props: Omit<BasePopover.Trigger.Props, "render" | "children"> & {
    children: ReactElement;
  },
) {
  const { children, ...rest } = props;
  return <BasePopover.Trigger render={children} {...rest} />;
}

/**
 * The surface, on Base UI's popover rather than its menu.
 *
 * A `role="menu"` is a list of commands: it owns typeahead and roving focus, so
 * a text field inside one never sees what is typed. This menu is a listbox with
 * a combobox driving it, which is the shape that can hold its own search.
 */
function MenuSurface(props: {
  children: ReactNode;
  popupId?: string;
  /** A nested surface: no entrance of its own, and it leaves with the tree. */
  submenu?: boolean;
  side?: BasePopover.Positioner.Props["side"];
  align?: BasePopover.Positioner.Props["align"];
  className?: string;
}) {
  const {
    children,
    submenu = false,
    side = "bottom",
    align = "start",
    className,
    popupId,
  } = props;
  // A submenu is part of the menu already on screen, not a new surface
  // arriving: growing it in reads as a second menu opening, and moving along a
  // row of them replays that animation over and over. But when the whole tree
  // is dismissed, every surface must play the same exit at the same moment —
  // so the exit half is put on while the tree is closing.
  const treeOpen = use(MenuOpenContext)?.open ?? true;
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={4}
        // A dropdown holds its side: its height is bounded to the room below
        // the trigger, so it always fits, and holding the side keeps the top
        // edge still while a query shortens the list. A submenu has no such
        // guarantee sideways — it has to flip when it runs out of room, or it
        // opens off the edge of the window.
        collisionAvoidance={
          submenu
            ? { side: "flip", align: "shift" }
            : { side: "none", align: "shift" }
        }
        className={clsx(popupZIndexClassName, "max-w-(--available-width)")}
      >
        <BasePopover.Popup
          id={popupId}
          data-menu-popup=""
          // Every menu can be typed into, so none of them may let a keystroke
          // reach the build's single-key shortcuts — otherwise searching for a
          // reviewer called "Yann" approves the build on the first letter.
          data-hotkeys-disabled=""
          initialFocus={false}
          // A closing submenu must never hand focus to its trigger row — the
          // caret belongs to a menu's field, and rows never take it. The root
          // keeps the default, which returns focus to the button that opened
          // the menu.
          finalFocus={submenu ? false : undefined}
          className={clsx(
            popupSurfaceClassName,
            submenu
              ? !treeOpen && popupExitAnimationClassName
              : popupAnimationClassName,
            // A menu is a list of things to pick, not prose: dragging across
            // it should never leave a text selection behind.
            "flex-col overflow-hidden outline-hidden select-none",
            className,
          )}
          style={{ minWidth: MENU_MIN_WIDTH, maxWidth: MENU_MAX_WIDTH }}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Search field                                                               */
/* -------------------------------------------------------------------------- */

function MenuSearchField(props: {
  label: string;
  hidden: boolean;
  /** Whether this menu is the one the keyboard is driving. */
  focused: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  listId: string;
  activeId: string | null;
}) {
  const { label, hidden, focused, inputRef, listId, activeId } = props;
  const search = useSearch();
  return (
    <div
      className={
        hidden
          ? // Off-screen rather than `hidden`: it still has to hold focus and
            // receive the keystroke that reveals it.
            "absolute -left-[9999px] size-px overflow-hidden"
          : "border-b-thin relative flex shrink-0 items-center px-3 py-2"
      }
    >
      {hidden ? null : (
        <SearchIcon className="text-placeholder mr-2 size-4 shrink-0" />
      )}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeId ?? undefined}
        aria-label={label}
        placeholder={label}
        value={search.query}
        // A menu that mounts already focused — opened, or asked for with the
        // keyboard — takes the caret as it appears. Focus moves between menus
        // that are already mounted are handled by the menu itself.
        autoFocus={focused}
        spellCheck={false}
        autoComplete="off"
        // Password managers otherwise offer to fill a menu's filter box.
        data-1p-ignore
        data-lpignore
        onChange={(event) => search.setQuery(event.target.value)}
        className="text-menu placeholder:text-placeholder w-full bg-transparent outline-none"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Focus                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Which menu in the tree the keyboard is driving.
 *
 * There is one focused menu for a menu and all of its submenus, named by
 * `focusedId`, whose state lives at the root and is inherited down. Every menu
 * owns a filter field, and the real caret always sits on the focused menu's
 * field — everything else is a highlight. The pointer focuses whatever menu it
 * is over; the right arrow focuses the highlighted row's submenu; the left
 * arrow focuses the parent again. Nothing else in a menu can take focus.
 */
type MenuState = {
  /** The menu that handed this down — a submenu's parent. */
  id: string;
  focusedId: string;
  setFocusedId: (id: string) => void;
  /** Put away the submenu this menu is showing. */
  closeSubmenu: () => void;
};

const MenuStateContext = createContext<MenuState | null>(null);

/** The field of a row's submenu, addressable before the submenu ever mounts. */
function getSubmenuMenuId(nodeId: string): string {
  return `${nodeId}-menu`;
}

/* -------------------------------------------------------------------------- */
/* The menu                                                                   */
/* -------------------------------------------------------------------------- */

type Point = { x: number; y: number };

/**
 * The wedge the pointer is crossing towards an open submenu, and the row that
 * owns it. It lives on the menu rather than the row because it is the *other*
 * rows that must respect it: crossing one on the way to a submenu must not let
 * it take the highlight, or open a submenu of its own.
 */
type GraceArea = { ownerId: string; area: Point[] } | null;

/** What a row tells the menu about itself when the pointer moves over it. */
type RowSnapshot = { id: string; disabled: boolean; hasChildren: boolean };

type MenuContextValue = {
  activeId: string | null;
  checkedIndicator: "icon" | "highlight";
  close: () => void;
  /** What a row calls once its action has run — see `MenuOpenState.unmount`. */
  closeNow: () => void;
  /**
   * Whether the focused row's submenu is open.
   *
   * One flag for the menu, not one per row: which submenu it refers to is
   * decided by which row is highlighted, so two rows can never disagree about
   * whose submenu is showing.
   */
  isSubmenuOpen: boolean;
  requestSubmenu: (open: boolean, options?: { delay?: number }) => void;
  /** Highlight a row and open its submenu right away — a click or Enter. */
  openSubmenu: (nodeId: string) => void;
  /** Route a pointer move over a row: highlight it, unless a wedge says wait. */
  handleRowPointerMove: (row: RowSnapshot, event: React.PointerEvent) => void;
  /** Publish the wedge the pointer is crossing, or clear it. */
  setGrace: (grace: GraceArea) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export function Menu(props: {
  children?: ReactNode;
  /** Shows a search field at all times instead of only once someone types. */
  search?: boolean | string;
  /** Said when the menu has no rows at all. */
  emptyPlaceholder?: string;
  /** Said when a query matched nothing. */
  noResultsPlaceholder?: string;
  /** How a checked row reads: a trailing check, or a highlighted bold row. */
  checkedIndicator?: "icon" | "highlight";
  side?: BasePopover.Positioner.Props["side"];
  align?: BasePopover.Positioner.Props["align"];
  className?: string;
  popupId?: string;
  "aria-label"?: string;
}) {
  const search = use(SearchContext);
  const open = use(MenuOpenContext)?.open ?? true;
  if (search) {
    return <MenuList {...props} />;
  }
  return (
    <MenuAutoComplete open={open}>
      <MenuList {...props} />
    </MenuAutoComplete>
  );
}

function MenuList(
  props: Parameters<typeof Menu>[0] & {
    /** Set by `SubMenuRow`, so the parent can focus this menu before it mounts. */
    menuId?: string;
    /** A submenu's own open state; the root reads the tree's instead. */
    open?: boolean;
  },
) {
  const {
    children,
    search: searchProp = false,
    emptyPlaceholder = "No items",
    noResultsPlaceholder = "No matching items",
    checkedIndicator = "icon",
    side,
    align,
    className,
    popupId,
    menuId,
    open: openProp,
  } = props;
  const search = useSearch();
  const reactId = useId();
  const id = menuId ?? reactId;
  const parentState = use(MenuStateContext);
  const isRoot = !parentState;
  const [rootFocusedId, setRootFocusedId] = useState<string | null>(null);
  const focusedId = parentState ? parentState.focusedId : (rootFocusedId ?? id);
  const setFocusedId = parentState
    ? parentState.setFocusedId
    : setRootFocusedId;
  const isFocused = focusedId === id;
  const openState = use(MenuOpenContext);
  const isOpen = openProp ?? openState?.open ?? true;
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allNodes = useMemo(() => getMenuNodes(children, id), [children, id]);
  const { nodes, filtered } = useMemo(
    () => filterMenuNodes(allNodes, search.query || null),
    [allNodes, search.query],
  );
  const visible = useMemo(() => pruneOrphans(nodes), [nodes]);
  const items = useMemo(
    () =>
      visible.filter(
        (node): node is ItemNode => node.type === "item" && !node.disabled,
      ),
    [visible],
  );

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // Derived rather than stored, and empty until something asks for it.
  //
  // A menu opens with no row highlighted: the first one is not chosen for you,
  // and only the arrow keys or the pointer pick one. A query is the exception —
  // it puts the highlight on the first match so Enter takes it.
  const activeId =
    items.find((item) => item.id === highlightedId)?.id ??
    (search.query ? (items[0]?.id ?? null) : null);

  const close = useCallback(() => {
    openState?.setOpen(false);
  }, [openState]);

  /** Closes the menu for good — see `MenuOpenState.unmount`. */
  const closeNow = useCallback(() => {
    openState?.setOpen(false);
    openState?.unmount();
  }, [openState]);

  const [isSubmenuOpen, setSubmenuOpen] = useState(false);
  const submenuTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(submenuTimer.current), []);
  const requestSubmenu = useCallback(
    (next: boolean, options?: { delay?: number }) => {
      const { delay = 0 } = options ?? {};
      clearTimeout(submenuTimer.current);
      if (delay === 0) {
        setSubmenuOpen(next);
        return;
      }
      submenuTimer.current = setTimeout(() => setSubmenuOpen(next), delay);
    },
    [],
  );
  const openSubmenu = useCallback(
    (nodeId: string) => {
      setHighlightedId(nodeId);
      requestSubmenu(true);
    },
    [requestSubmenu],
  );

  // Read by timers and pointer handlers, which outlive the render that armed
  // them and must see the values of the latest one.
  const activeIdRef = useRef(activeId);
  const isFocusedRef = useRef(isFocused);
  useEffect(() => {
    activeIdRef.current = activeId;
    isFocusedRef.current = isFocused;
  });

  const grace = useRef<GraceArea>(null);
  /** The last pointer move the wedge swallowed, honoured if the wedge lapses. */
  const graceBlocked = useRef<{ id: string; hasChildren: boolean } | null>(
    null,
  );
  // Written through callbacks that live where the ref does: a child may not
  // reach into a ref it got from context and mutate it.
  const graceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(graceTimer.current), []);
  const setGrace = useCallback(
    (next: GraceArea) => {
      clearTimeout(graceTimer.current);
      grace.current = next;
      graceBlocked.current = null;
      if (!next) {
        return;
      }
      // The wedge is a grace period, not a rule: a pointer that stops on the
      // way to the submenu was not heading there after all. When it lapses,
      // the row the pointer stopped on takes the highlight it was refused —
      // unless the pointer made it to the submenu, which will hold the focus
      // by then.
      graceTimer.current = setTimeout(() => {
        grace.current = null;
        const blocked = graceBlocked.current;
        graceBlocked.current = null;
        if (blocked && isFocusedRef.current) {
          setHighlightedId(blocked.id);
          requestSubmenu(blocked.hasChildren);
        }
      }, SUBMENU_GRACE_TIMEOUT);
    },
    [requestSubmenu],
  );
  const handleRowPointerMove = useCallback(
    (row: RowSnapshot, event: React.PointerEvent) => {
      // A disabled row takes no highlight. Handing its id over would land on a
      // row the keyboard cannot reach, and the highlight would fall back to
      // the first item — so pointing at a disabled row jumped the selection.
      if (row.disabled) {
        return;
      }
      // Already the highlighted row: nothing to do, and nothing to measure.
      // Moving the pointer across a row fires this continuously.
      if (activeIdRef.current === row.id) {
        graceBlocked.current = null;
        return;
      }
      const current = grace.current;
      if (
        current &&
        current.ownerId !== row.id &&
        checkIsPointInPolygon(
          { x: event.clientX, y: event.clientY },
          current.area,
        )
      ) {
        graceBlocked.current = { id: row.id, hasChildren: row.hasChildren };
        return;
      }
      graceBlocked.current = null;
      setHighlightedId(row.id);
      // Arriving on a row settles what the submenu flag means: a row that has
      // one asks for it after a beat, a row that has none puts it away. That
      // single rule is the whole handover between neighbouring submenus.
      requestSubmenu(row.hasChildren, {
        delay: row.hasChildren ? SUBMENU_OPEN_DELAY : 0,
      });
    },
    [requestSubmenu],
  );

  const context = useMemo<MenuContextValue>(
    () => ({
      activeId,
      checkedIndicator,
      close,
      closeNow,
      isSubmenuOpen,
      requestSubmenu,
      openSubmenu,
      handleRowPointerMove,
      setGrace,
    }),
    [
      activeId,
      checkedIndicator,
      close,
      closeNow,
      isSubmenuOpen,
      requestSubmenu,
      openSubmenu,
      handleRowPointerMove,
      setGrace,
    ],
  );

  // A menu opens as it was born: no highlight, no submenu, the keyboard at
  // the root. The state outlives the popup — the components stay mounted
  // while it is closed — so it is put back on the way in, the same way the
  // query is in `MenuAutoComplete`.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setHighlightedId(null);
      setSubmenuOpen(false);
      if (isRoot) {
        setRootFocusedId(id);
      }
    }
  }

  // The real caret follows the focused menu: each menu has a field, and
  // whichever menu the keyboard is driving holds the focus on its own.
  useLayoutEffect(() => {
    if (isOpen && isFocused) {
      inputRef.current?.focus();
    }
  }, [isOpen, isFocused]);

  // A submenu that closes while focused — scrolled away, or dismissed by Base
  // UI — hands the keyboard back to its parent instead of leaving it nowhere.
  useEffect(() => {
    if (!isOpen && parentState && parentState.focusedId === id) {
      parentState.setFocusedId(parentState.id);
    }
  }, [isOpen, parentState, id]);

  // A new query reads from the top: the first match is the highlighted one,
  // so the list must be looking at it.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [search.query]);

  const scrollRowIntoView = (rowId: string) => {
    document.getElementById(rowId)?.scrollIntoView({ block: "nearest" });
  };

  const moveHighlight = (delta: number) => {
    if (items.length === 0) {
      return;
    }
    const current = items.findIndex((item) => item.id === activeId);
    const next =
      current === -1
        ? // From nothing, down enters at the top and up at the bottom.
          delta > 0
          ? items[0]
          : items.at(-1)
        : items[(current + delta + items.length) % items.length];
    if (next) {
      setHighlightedId(next.id);
      scrollRowIntoView(next.id);
    }
  };

  /**
   * Press the highlighted row, the way the pointer would.
   *
   * @param aim - `checkbox` presses the row's box instead of the row, which is
   *   what keeps a split row's toggle reachable from the keyboard. Rows without
   *   a box of their own take the press whole.
   */
  const activateItem = (item: ItemNode, aim: "row" | "checkbox" = "row") => {
    if (item.children.length > 0) {
      openSubmenu(item.id);
      // A submenu asked for by the keyboard takes the keyboard with it.
      setFocusedId(getSubmenuMenuId(item.id));
      return;
    }
    const row = document.getElementById(item.id);
    const checkbox =
      aim === "checkbox"
        ? row?.querySelector<HTMLElement>("[data-menu-item-checkbox]")
        : null;
    (checkbox ?? row)?.click();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // A menu's keys are its own. A submenu is portalled, but React events
    // follow the component tree, so without this its keys would also run the
    // parent menu's handler and move both lists at once.
    event.stopPropagation();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
      case "End": {
        // With a query in the field, these belong to the caret.
        if (search.query) {
          break;
        }
        event.preventDefault();
        const target = event.key === "Home" ? items[0] : items.at(-1);
        if (target) {
          setHighlightedId(target.id);
          scrollRowIntoView(target.id);
        }
        break;
      }
      case "ArrowRight": {
        const active = items.find((item) => item.id === activeId);
        if (!active || active.children.length === 0) {
          break;
        }
        // With text in the field, the arrow first belongs to the caret; only
        // from the far end does it mean the submenu.
        if (!checkCaretAtEdge(event.target, "end")) {
          break;
        }
        event.preventDefault();
        activateItem(active);
        break;
      }
      case "ArrowLeft": {
        if (parentState) {
          if (!checkCaretAtEdge(event.target, "start")) {
            break;
          }
          event.preventDefault();
          // Hand the keyboard back to the parent, and put this submenu away.
          parentState.setFocusedId(parentState.id);
          parentState.closeSubmenu();
        } else if (isSubmenuOpen) {
          event.preventDefault();
          requestSubmenu(false);
        }
        break;
      }
      case "Enter": {
        event.preventDefault();
        const active = items.find((item) => item.id === activeId);
        if (active) {
          activateItem(active);
        }
        break;
      }
      case " ": {
        // In an empty, untouched field, space is a press, not a character: it
        // ticks the highlighted row where Enter runs it. Once a query exists —
        // or ever did — it types, because queries have spaces in them.
        if (search.query || search.touched) {
          break;
        }
        event.preventDefault();
        const active = items.find((item) => item.id === activeId);
        if (active) {
          activateItem(active, "checkbox");
        }
        break;
      }
      case "Tab": {
        // Focus lives in the field and nowhere else — there is no next thing
        // inside a menu for Tab to go to, and letting it out would leave the
        // menu open behind the caret.
        event.preventDefault();
        break;
      }
      case "Escape": {
        event.preventDefault();
        close();
        break;
      }
      default:
        break;
    }
  };

  const state = useMemo<MenuState>(
    () => ({
      id,
      focusedId,
      setFocusedId,
      closeSubmenu: () => requestSubmenu(false),
    }),
    [id, focusedId, setFocusedId, requestSubmenu],
  );

  const showSearch = searchProp !== false || search.touched;
  const searchLabel =
    typeof searchProp === "string" ? searchProp : "Filter items";

  return (
    <MenuSurface
      side={side}
      align={align}
      className={className}
      popupId={popupId}
      submenu={!isRoot}
    >
      <div
        className="flex min-h-0 flex-col"
        // Pointing at a menu is asking to drive it: moving over a submenu
        // sends the keyboard there, and moving back to the parent brings it
        // back. Moves rather than enters — React's enter never fires again
        // when the pointer comes back from a submenu, because a portal is
        // still this component's child and it thinks the pointer never left.
        // Stopped here for the same reason: a submenu's moves would bubble
        // out of the portal into the parent's wrapper and hand the keyboard
        // straight back.
        onPointerMove={(event) => {
          event.stopPropagation();
          if (!isFocused) {
            setFocusedId(id);
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <MenuSearchField
          label={searchLabel}
          hidden={!showSearch}
          focused={isFocused}
          inputRef={inputRef}
          listId={listId}
          activeId={activeId}
        />
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={props["aria-label"]}
          className={clsx("min-h-0 flex-1", menuListClassName)}
          style={{
            maxHeight: `min(${MENU_MAX_HEIGHT}px, var(--available-height))`,
          }}
          // A submenu hangs beside its row; once the row scrolls away it
          // points at nothing.
          onScroll={() => requestSubmenu(false)}
          // Pressing a row must not pull the caret out of the field.
          onMouseDown={(event) => event.preventDefault()}
        >
          <MenuStateContext value={state}>
            <MenuContext value={context}>
              {visible.length === 0 ? (
                <p className="text-low px-2 py-1.5 text-xs">
                  {filtered ? noResultsPlaceholder : emptyPlaceholder}
                </p>
              ) : (
                visible.map((node) => (
                  <MenuNodeRenderer key={node.id} node={node} />
                ))
              )}
            </MenuContext>
          </MenuStateContext>
        </div>
      </div>
    </MenuSurface>
  );
}

/** Whether the caret sits at that edge of the field, with nothing selected. */
function checkCaretAtEdge(target: EventTarget, edge: "start" | "end"): boolean {
  if (!(target instanceof HTMLInputElement)) {
    return true;
  }
  const { selectionStart, selectionEnd, value } = target;
  if (edge === "start") {
    return selectionStart === 0 && selectionEnd === 0;
  }
  return selectionStart === value.length && selectionEnd === value.length;
}

function MenuNodeRenderer(props: { node: MenuNode }) {
  const { node } = props;
  switch (node.type) {
    case "separator":
      return <div className={menuSeparatorClassName} />;
    case "heading":
      return <div className={menuHeadingClassName}>{node.title}</div>;
    case "placeholder":
      return node.element;
    case "item":
      return node.children.length > 0 ? (
        <SubMenuRow node={node} />
      ) : (
        <MenuItemRow node={node} />
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Items                                                                      */
/* -------------------------------------------------------------------------- */

export type MenuItemProps = {
  children: ReactNode;
  /** What the query matches, when the children are not plain text. */
  textValue?: string;
  subtitle?: ReactNode;
  subtitleTextValue?: string;
  /** Extra words that match this row without being shown. */
  keywords?: string[];
  /** Keeps the row through any query, ordered by this number. */
  filterPriority?: number;
  icon?: ReactNode;
  suffix?: ReactNode;
  /** The shortcut that runs this row, one key per box: `["⌘", "E"]`. */
  keyboardShortcut?: readonly string[];
  disabled?: boolean;
  variant?: "default" | "danger";
  checked?: boolean;
  /**
   * Draws a checkbox and keeps the menu open when the row is activated.
   *
   * Given an `onAction` too, the box becomes a target of its own and the row
   * splits: the box toggles this one and the menu stays open, while the rest of
   * the row runs the action and closes — which is how a filter offers "narrow
   * to this one" and "add this one" from the same list.
   */
  checkbox?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Run on activation. Returning a promise holds the menu open until it settles. */
  onAction?: () => void | Promise<unknown>;
  href?: string;
  /** Where a link row opens, e.g. `"_blank"` for one that leaves the app. */
  target?: string;
};

export function MenuItem(_props: MenuItemProps): null {
  return null;
}
MenuItem[MENU_PART] = "item" satisfies MenuPartKind;

export function MenuSection(_props: { children: ReactNode }): null {
  return null;
}
MenuSection[MENU_PART] = "section" satisfies MenuPartKind;

export function MenuHeading(_props: { children: ReactNode }): null {
  return null;
}
MenuHeading[MENU_PART] = "heading" satisfies MenuPartKind;

export function MenuSeparator(): null {
  return null;
}
MenuSeparator[MENU_PART] = "separator" satisfies MenuPartKind;

function useMenuContext(): MenuContextValue {
  const context = use(MenuContext);
  if (!context) {
    throw new Error("Menu items must be rendered inside a Menu");
  }
  return context;
}

function MenuItemRow(
  props: { node: ItemNode } & React.HTMLAttributes<HTMLElement> & {
      ref?: React.Ref<HTMLDivElement>;
    },
) {
  const { node, ref, onPointerMove: onPointerMoveProp, ...rest } = props;
  const menu = useMenuContext();
  const isSubmenu = node.children.length > 0;
  const itemProps = (
    isSubmenu
      ? (findSubmenuTriggerProps(node) ?? {})
      : (node.element.props as MenuItemProps)
  ) as MenuItemProps;
  const [pending, setPending] = useState(false);
  const active = menu.activeId === node.id;

  // With an action to run, the box is worth pressing on its own; without one
  // it would toggle exactly what the row around it already toggles.
  const checkboxIsOwnTarget = Boolean(itemProps.checkbox && itemProps.onAction);

  const toggle = () => {
    if (itemProps.disabled || pending) {
      return;
    }
    itemProps.onCheckedChange?.(!itemProps.checked);
  };

  const activate = () => {
    if (itemProps.disabled || pending) {
      return;
    }
    // A trigger row has no action of its own: pressing it opens its submenu,
    // and never closes the menu.
    if (isSubmenu) {
      menu.openSubmenu(node.id);
      return;
    }
    if (itemProps.checkbox && !checkboxIsOwnTarget) {
      toggle();
      return;
    }
    const result = itemProps.onAction?.();
    if (result instanceof Promise) {
      setPending(true);
      result.finally(() => {
        setPending(false);
        menu.closeNow();
      });
      return;
    }
    menu.closeNow();
  };

  const highlighted =
    itemProps.checked && menu.checkedIndicator === "highlight";

  const rowProps: React.HTMLAttributes<HTMLElement> = {
    "aria-selected": active,
    "aria-disabled": itemProps.disabled || undefined,
    onClick: activate,
    onPointerMove: (event) => {
      onPointerMoveProp?.(event);
      menu.handleRowPointerMove(
        {
          id: node.id,
          disabled: Boolean(itemProps.disabled),
          hasChildren: isSubmenu,
        },
        event,
      );
    },
    ...rest,
    // After the trigger's own props, which would otherwise win: a submenu row
    // is still an option of this list with this node's id — Base UI would
    // rename it `role="button"` with an id of its own, and the field's
    // `aria-activedescendant` would point at nothing.
    id: node.id,
    role: "option",
    // Never in the tab order: the caret lives in the menu's field, and rows
    // are reached with the arrows. Base UI's trigger would otherwise hand a
    // submenu row `tabIndex={0}` and Tab would walk the triggers.
    tabIndex: -1,
    className: clsx(
      getMenuItemClassName({
        variant: itemProps.variant,
        interactive: Boolean(itemProps.href),
      }),
      itemProps.disabled && "opacity-disabled",
      highlighted && selectedMenuItemClassName,
    ),
  };

  const content = (
    <>
      {itemProps.checkbox ? (
        <MenuItemCheckbox
          checked={Boolean(itemProps.checked)}
          onToggle={checkboxIsOwnTarget ? toggle : null}
        />
      ) : null}
      {itemProps.icon ? (
        <span className={menuItemIconClassName}>{itemProps.icon}</span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">
          {node.parent ? (
            <>
              <span className="text-low">{node.parent.title}</span>
              <span className="text-low mx-1">›</span>
            </>
          ) : null}
          {itemProps.children}
        </span>
        {itemProps.subtitle ? (
          <span className={menuItemDescriptionClassName}>
            {itemProps.subtitle}
          </span>
        ) : null}
      </span>
      {itemProps.keyboardShortcut ? (
        <Shortcut keys={itemProps.keyboardShortcut} />
      ) : null}
      {itemProps.suffix ? (
        <span className={clsx(menuItemSuffixClassName, "font-normal")}>
          {itemProps.suffix}
        </span>
      ) : null}
      {itemProps.checked &&
      !itemProps.checkbox &&
      menu.checkedIndicator === "icon" ? (
        <CheckIcon className="size-4 shrink-0" />
      ) : null}
      {isSubmenu ? (
        <ChevronRightIcon className="text-default size-4 shrink-0" />
      ) : null}
    </>
  );

  // A row that navigates is an anchor, so it can be middle-clicked and read as
  // a link. `RouterLink` keeps an in-app path on the client router and leaves a
  // scheme like `codex://` as a plain href.
  if (itemProps.href) {
    return (
      <RouterLink
        href={itemProps.href}
        target={itemProps.target}
        data-variant={itemProps.variant ?? "default"}
        data-active={active || undefined}
        {...rowProps}
      >
        {content}
      </RouterLink>
    );
  }
  return (
    <div
      ref={ref}
      data-variant={itemProps.variant ?? "default"}
      data-active={active || undefined}
      {...rowProps}
    >
      {content}
    </div>
  );
}

/**
 * The box a checkbox row leads with.
 *
 * `onToggle` is what makes it a control rather than a glyph: given one it takes
 * the press itself and stops it there, so the row's own action never runs and
 * the menu stays open. The halo is the only cue that the row has two halves, so
 * it is drawn only when there really are two.
 */
function MenuItemCheckbox(props: {
  checked: boolean;
  onToggle: (() => void) | null;
}) {
  const { checked, onToggle } = props;
  const box = (
    <span
      className={clsx(
        "border-primary text-primary flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
        checked
          ? "bg-primary-active border-active opacity-100"
          : "opacity-0 group-data-active/menu-item:opacity-100",
        // Only ever matches under the pressable wrapper below, which is the
        // only place the box is a thing you can point at.
        "group-hover/menu-checkbox:border-primary-active",
      )}
    >
      {checked ? <CheckIcon className="size-3" /> : null}
    </span>
  );
  if (!onToggle) {
    return box;
  }
  return (
    <span
      // How the keyboard finds the box to tick, having only the row's id.
      data-menu-item-checkbox=""
      // Padded out to a pressable size, then pulled back in so the row lays out
      // as if the box were still its own 14px self.
      className="group/menu-checkbox -m-1 flex shrink-0 p-1"
      onClick={(event) => {
        // The row would otherwise run its action and close the menu under the
        // box that was just ticked.
        event.stopPropagation();
        onToggle();
      }}
    >
      {box}
    </span>
  );
}

function findSubmenuTriggerProps(node: ItemNode): MenuItemProps | null {
  const children = (node.element.props as { children?: ReactNode }).children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (
      child &&
      typeof child === "object" &&
      "props" in child &&
      "type" in child
    ) {
      const type = child.type as { [MENU_PART]?: MenuPartKind };
      if (type[MENU_PART] === "item") {
        return child.props as MenuItemProps;
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Submenus                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A row that opens a menu of its own.
 *
 * Holds the row and the submenu together:
 *
 * ```tsx
 * <SubMenu>
 *   <MenuItem icon={<CopyIcon />}>Copy image</MenuItem>
 *   <SubMenuContent>
 *     <MenuItem>as PNG</MenuItem>
 *     <MenuItem>as JPEG</MenuItem>
 *   </SubMenuContent>
 * </SubMenu>
 * ```
 *
 * The content is read by the parent as well as rendered here, so a query in the
 * parent finds "as PNG" and shows it as `Copy image › as PNG` without anyone
 * opening the submenu.
 */
export function SubMenu(_props: { children: ReactNode }): null {
  return null;
}
SubMenu[MENU_PART] = "submenu" satisfies MenuPartKind;

export function SubMenuContent(_props: { children: ReactNode }): null {
  return null;
}
SubMenuContent[MENU_PART] = "submenu-content" satisfies MenuPartKind;

/** How long the pointer rests on a row before its submenu opens. */
const SUBMENU_OPEN_DELAY = 100;
/** How long the pointer has to cross the grace wedge before it lapses. */
const SUBMENU_GRACE_TIMEOUT = 300;

/**
 * Whether the pointer is still inside the grace area — the wedge between where
 * it left the row and the submenu it is heading for.
 *
 * Ray casting: count how many polygon edges a ray from the point crosses. An
 * odd count means inside.
 */
function checkIsPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) {
      continue;
    }
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function SubMenuRow(props: { node: ItemNode }) {
  const { node } = props;
  const menu = useMenuContext();
  const treeOpen = use(MenuOpenContext)?.open ?? true;
  const popupId = `${node.id}-submenu`;
  // Derived, never stored: the menu says whether a submenu is showing, and the
  // highlight says whose. And the tree's own open state folds in, so closing
  // the root sends every level away in the same commit — which is what lets
  // them animate out together.
  const open = treeOpen && menu.isSubmenuOpen && menu.activeId === node.id;
  const content = getSubMenuContent(node);

  return (
    <BasePopover.Root
      open={open}
      onOpenChange={(next, eventDetails) => {
        // Pressing the row is handled by the row itself, and it only ever
        // opens. Left to Base UI it would toggle: a click on the row of an
        // open submenu would close it.
        if (!next && eventDetails.reason === "trigger-press") {
          return;
        }
        menu.requestSubmenu(next);
      }}
    >
      <BasePopover.Trigger
        // The row is a div, not a button: it must not be pressable by Tab or
        // announced as one — the menu drives it.
        nativeButton={false}
        render={
          <MenuItemRow
            node={node}
            onPointerLeave={(event) => {
              const popup = document.getElementById(popupId);
              if (!open || !popup) {
                return;
              }
              const content = popup.getBoundingClientRect();
              const row = event.currentTarget.getBoundingClientRect();
              const rightSide = content.left > row.left;
              // Bleed the exit point inwards so it lands inside the wedge
              // rather than exactly on its edge.
              const bleed = rightSide ? -5 : 5;
              const near = rightSide ? content.left : content.right;
              const far = rightSide ? content.right : content.left;
              menu.setGrace({
                ownerId: node.id,
                area: [
                  { x: event.clientX + bleed, y: event.clientY },
                  { x: near, y: content.top },
                  { x: far, y: content.top },
                  { x: far, y: content.bottom },
                  { x: near, y: content.bottom },
                ],
              });
            }}
          />
        }
      />
      {/* Mounted whether or not it is open: Base UI keeps the popup itself
          out of the DOM until then, and an unmounted popover cannot play the
          exit the whole tree shares. Its own search state hangs here so a
          query in the submenu is the submenu's alone. */}
      <MenuAutoComplete>
        <MenuList
          menuId={getSubmenuMenuId(node.id)}
          open={open}
          side="right"
          align="start"
          aria-label={node.title}
          popupId={popupId}
        >
          {content}
        </MenuList>
      </MenuAutoComplete>
    </BasePopover.Root>
  );
}

function getSubMenuContent(node: ItemNode): ReactNode {
  const children = (node.element.props as { children?: ReactNode }).children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (
      child &&
      typeof child === "object" &&
      "props" in child &&
      "type" in child
    ) {
      const type = child.type as { [MENU_PART]?: MenuPartKind };
      if (type[MENU_PART] === "submenu-content") {
        return (child.props as { children?: ReactNode }).children;
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Filler rows                                                                */
/* -------------------------------------------------------------------------- */

/** Shown in place of the items while they are still being fetched. */
export function MenuLoader() {
  return (
    <p aria-busy className={menuTextClassName}>
      Loading…
    </p>
  );
}
MenuLoader[MENU_PART] = "placeholder" satisfies MenuPartKind;

/** A line of prose among the rows — a hint, or a reason the list is short. */
export function MenuText(props: { children: ReactNode }) {
  return <p className={menuTextClassName}>{props.children}</p>;
}
MenuText[MENU_PART] = "placeholder" satisfies MenuPartKind;

/**
 * An explanation attached to a row, for the cases where the row's own words
 * cannot carry it — why an action is unavailable, most often.
 */
export function MenuItemTooltip(props: { content: ReactNode }) {
  if (!props.content) {
    return null;
  }
  return (
    <Tooltip content={props.content}>
      <InfoIcon className="text-low size-[1em] shrink-0" />
    </Tooltip>
  );
}
