import { Fragment, memo, useEffect, useMemo, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/ui/Dialog";
import { Modal } from "@/ui/Modal";
import { Shortcut } from "@/ui/Shortcut";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { useLiveRef } from "@/ui/useLiveRef";

import {
  HotkeysDialogState,
  useBuildHotkeysDialogState,
} from "./BuildHotkeysDialogState";
import {
  checkHotkeyMatches,
  getHotkey,
  plainHotkeyGroups,
  type Hotkey,
  type HotkeyEnv,
  type HotkeyGroup,
  type HotkeyName,
} from "./hotkeys";

type HotkeyOptions = {
  preventDefault: boolean;
  enabled: boolean;
  allowInInput: boolean;
  ignoreInteractiveTarget: boolean;
};

type HotkeyRegistration = {
  hotkey: Hotkey;
  /** Live ref so callback/options updates don't require re-registering. */
  ref: React.RefObject<{
    callback: (event: KeyboardEvent) => void;
    options: HotkeyOptions;
  }>;
  /** Pending async dispatch, cleared on unregister. */
  timeout: number;
};

/**
 * Single source of truth for build hotkeys: every `useBuildHotkey` consumer
 * registers here and we keep a single capture-phase `keydown` listener on the
 * document, instead of one listener per hook.
 */
const hotkeyRegistry = new Set<HotkeyRegistration>();

function handleDocumentKeyDown(event: KeyboardEvent) {
  // Guards shared by all hotkeys, based solely on the event target.

  // If the element has a modal as ancestor, it means a modal is open (because
  // of focus trap). So by doing that we ignore all hotkeys when a modal is open.
  if (
    event.target instanceof HTMLElement &&
    event.target.closest("[data-modal]")
  ) {
    return;
  }

  if (document.getElementById("root")?.getAttribute("aria-hidden") === "true") {
    return;
  }

  // Ignore key events from menu, menuitem or textbox
  if (
    event.target instanceof HTMLElement &&
    (event.target.role === "menu" ||
      event.target.role?.startsWith("menuitem") ||
      event.target.role === "textbox" ||
      event.target.closest("[data-hotkeys-disabled]") ||
      event.target.closest("[role=dialog]"))
  ) {
    return;
  }

  const isTextInput =
    event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLInputElement && event.target.type === "text");

  for (const registration of hotkeyRegistry) {
    const { hotkey, ref } = registration;
    const { callback, options } = ref.current;

    if (!options.enabled) {
      continue;
    }

    if (!options.allowInInput && isTextInput) {
      continue;
    }

    // Let interactive elements (buttons, links, inputs…) handle the key
    // themselves when the hotkey opts into yielding to them.
    if (
      options.ignoreInteractiveTarget &&
      event.target instanceof HTMLElement &&
      event.target.closest("button, a, [role=button], input, select, textarea")
    ) {
      continue;
    }

    if (!checkHotkeyMatches(hotkey, event)) {
      continue;
    }

    if (options.preventDefault) {
      event.preventDefault();
    }

    // Make sure events are triggered asynchronously.
    registration.timeout = window.setTimeout(() => {
      callback(event);
    });
  }
}

function registerHotkey(registration: HotkeyRegistration) {
  if (hotkeyRegistry.size === 0) {
    document.addEventListener("keydown", handleDocumentKeyDown, {
      capture: true,
    });
  }
  hotkeyRegistry.add(registration);
  return () => {
    window.clearTimeout(registration.timeout);
    hotkeyRegistry.delete(registration);
    if (hotkeyRegistry.size === 0) {
      document.removeEventListener("keydown", handleDocumentKeyDown, {
        capture: true,
      });
    }
  };
}

export function useBuildHotkey(
  name: HotkeyName,
  callback: (event: KeyboardEvent) => void,
  options?: {
    preventDefault?: boolean;
    enabled?: boolean;
    allowInInput?: boolean;
    /**
     * Ignore the hotkey when the event targets an interactive element
     * (button, link, input…), letting the element handle the key itself.
     */
    ignoreInteractiveTarget?: boolean;
  },
): Hotkey {
  const hotkey = getHotkey(name);
  const {
    preventDefault = true,
    enabled = true,
    allowInInput = false,
    ignoreInteractiveTarget = false,
  } = options ?? {};
  const ref = useLiveRef({
    callback,
    options: { preventDefault, enabled, allowInInput, ignoreInteractiveTarget },
  });
  useEffect(() => {
    return registerHotkey({ hotkey, ref, timeout: 0 });
  }, [hotkey, ref]);
  return hotkey;
}

export function BuildHotkeysDialog(props: { env: HotkeyEnv }) {
  const state = useBuildHotkeysDialogState();
  return state ? (
    <BuildHotkeysDialogWithState state={state} {...props} />
  ) : null;
}

/** One line of the dialog: a label, and every key that reaches it. */
type ListedRow = { id: string; label: string; hotkeys: Hotkey[] };

type ListedItem =
  | ({ kind: "row" } & ListedRow)
  | { kind: "section"; id: string; label: string; rows: ListedRow[] };

/**
 * A group's hotkeys as the dialog lists them, which is not one line each:
 * hotkeys sharing a `listing.row` collapse onto one line, and those sharing a
 * `listing.section` gather into a sub-list. See {@link HotkeyListing}.
 */
function listGroup(group: HotkeyGroup, env: HotkeyEnv): ListedItem[] {
  const items: ListedItem[] = [];
  // The item each row/section label is currently filling, so the second
  // hotkey of a pair finds the line the first one opened.
  const openItems = new Map<string, ListedItem>();
  for (const [name, hotkey] of Object.entries(group.hotkeys)) {
    if (!hotkey || !hotkey.envs.includes(env)) {
      continue;
    }
    const { listing } = hotkey;
    if (listing && "section" in listing) {
      const key = `section:${listing.section}`;
      const open = openItems.get(key);
      const row: ListedRow = {
        id: name,
        label: listing.label,
        hotkeys: [hotkey],
      };
      if (open?.kind === "section") {
        open.rows.push(row);
        continue;
      }
      const item: ListedItem = {
        kind: "section",
        id: listing.section,
        label: listing.section,
        rows: [row],
      };
      openItems.set(key, item);
      items.push(item);
      continue;
    }
    if (listing && "row" in listing) {
      const key = `row:${listing.row}`;
      const open = openItems.get(key);
      if (open?.kind === "row") {
        open.hotkeys.push(hotkey);
        continue;
      }
      const item: ListedItem = {
        kind: "row",
        id: listing.row,
        label: listing.row,
        hotkeys: [hotkey],
      };
      openItems.set(key, item);
      items.push(item);
      continue;
    }
    items.push({
      kind: "row",
      id: name,
      label: listing?.label ?? hotkey.description,
      hotkeys: [hotkey],
    });
  }
  return items;
}

function checkRowMatches(row: ListedRow, query: string): boolean {
  return (
    row.label.toLowerCase().includes(query) ||
    row.hotkeys.some(
      (hotkey) =>
        // The full sentence too, so a row listed under a shorter label is
        // still found by the words the toolbar tooltip uses for it.
        hotkey.description.toLowerCase().includes(query) ||
        hotkey.displayKeys.join(" ").toLowerCase().includes(query),
    )
  );
}

/** `item` reduced to what matches `query`, or null when nothing in it does. */
function filterItem(item: ListedItem, query: string): ListedItem | null {
  if (item.kind === "section") {
    // A heading that matches keeps its whole sub-list: what was asked for is
    // the set, not one member of it.
    if (item.label.toLowerCase().includes(query)) {
      return item;
    }
    const rows = item.rows.filter((row) => checkRowMatches(row, query));
    return rows.length > 0 ? { ...item, rows } : null;
  }
  return checkRowMatches(item, query) ? item : null;
}

function HotkeyListRow(props: { row: ListedRow }) {
  const { row } = props;
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{row.label}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        {row.hotkeys.map((hotkey, index) => (
          <Fragment key={hotkey.displayKeys.join("+")}>
            {/* A combination is itself a run of keycaps, so the gap between
                two of them does not read as a break. The slash is the one the
                label already carries. */}
            {index > 0 ? <span className="text-low">/</span> : null}
            <Shortcut keys={hotkey.displayKeys} variant="boxed" />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

const BuildHotkeysDialogWithState = memo(
  (props: { state: HotkeysDialogState; env: HotkeyEnv }) => {
    const { env, state } = props;
    const [query, setQuery] = useState("");
    useBuildHotkey("toggleHotkeysDialog", () =>
      state.setIsOpen((value) => !value),
    );
    const groups = useMemo(() => {
      const search = query.trim().toLowerCase();
      return plainHotkeyGroups.flatMap((group) => {
        const items = listGroup(group, env)
          .map((item) => (search ? filterItem(item, search) : item))
          .filter((item) => item !== null);
        return items.length > 0 ? [{ name: group.name, items }] : [];
      });
    }, [env, query]);
    return (
      <Modal
        open={state.isOpen}
        onOpenChange={(open) => {
          state.setIsOpen(open);
          if (!open) {
            setQuery("");
          }
        }}
        dismissible
      >
        <Dialog size="medium">
          <DialogBody>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <Button
              variant="secondary"
              iconOnly
              onClick={() => state.setIsOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10"
            >
              <XIcon />
            </Button>
            <TextInputGroup className="mb-4">
              <TextInputIcon>
                <SearchIcon />
              </TextInputIcon>
              <TextInput
                scale="sm"
                type="search"
                // The dialog is opened to look something up, so the caret
                // starts where the looking up happens.
                autoFocus
                autoComplete="off"
                spellCheck={false}
                aria-label="Filter shortcuts"
                placeholder="Filter shortcuts…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </TextInputGroup>
            {groups.length === 0 ? (
              <div className="text-low py-8 text-center text-sm">
                No shortcut matches “{query.trim()}”.
              </div>
            ) : (
              <div className="gap-8 md:columns-2">
                {groups.map((group) => (
                  <div
                    key={group.name}
                    className="mb-6 break-inside-avoid-column last:mb-0"
                  >
                    <h3 className="text-low mb-2 text-xs font-medium">
                      {group.name}
                    </h3>
                    <div className="flex flex-col gap-1 text-sm">
                      {group.items.map((item) =>
                        item.kind === "section" ? (
                          // The tint marks the sub-list; the negative margin
                          // cancels its own padding, so its labels and keys
                          // stay on the columns the plain rows sit on.
                          <div
                            key={item.id}
                            className="bg-subtle -mx-2.5 my-1 rounded-lg px-2.5 py-2"
                          >
                            <div className="text-low mb-1 text-xs">
                              {item.label}
                            </div>
                            <div className="flex flex-col gap-1">
                              {item.rows.map((row) => (
                                <HotkeyListRow key={row.id} row={row} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <HotkeyListRow key={item.id} row={item} />
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
        </Dialog>
      </Modal>
    );
  },
);
