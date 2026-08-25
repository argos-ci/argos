import { memo, useEffect, useMemo, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Dialog, DialogTitle } from "@/ui/Dialog";
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

function checkMatchesQuery(hotkey: Hotkey, query: string): boolean {
  return (
    hotkey.description.toLowerCase().includes(query) ||
    hotkey.displayKeys.join(" ").toLowerCase().includes(query)
  );
}

/**
 * Every shortcut, listed one per line and searched rather than read. Nobody
 * reads a list of forty-five bindings top to bottom; the dialog is opened to
 * find one thing, so each line says the whole of what it does — a line that
 * has been shortened, or folded together with its opposite, is a line that
 * cannot be found by the words someone would search for, or that leaves them
 * guessing which of two keys they wanted.
 */
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
        const hotkeys = Object.entries(group.hotkeys).filter(
          ([, hotkey]) =>
            hotkey &&
            hotkey.envs.includes(env) &&
            (!search || checkMatchesQuery(hotkey, search)),
        );
        return hotkeys.length > 0 ? [{ name: group.name, hotkeys }] : [];
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
        {/* The list scrolls under a header that does not, so the box being
            typed into stays put while its results move. */}
        <Dialog scrollable={false} className="flex w-md flex-col">
          <div className="shrink-0 p-4 pb-0">
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
            <TextInputGroup>
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
                aria-label="Search shortcuts"
                placeholder="Search shortcuts"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </TextInputGroup>
          </div>
          {groups.length === 0 ? (
            <div className="text-low px-4 pb-8 text-center text-sm">
              No shortcut matches “{query.trim()}”.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto pb-3">
              {groups.map((group) => (
                <div key={group.name}>
                  {/* Padded per row rather than on the scroller, and above
                      itself rather than below the group before it, so the
                      heading's background covers every pixel it sticks
                      across and no row shows through around it. */}
                  <h3 className="bg-app text-low sticky top-0 px-4 pt-4 pb-1.5 text-xs font-medium">
                    {group.name}
                  </h3>
                  {group.hotkeys.map(([name, hotkey]) =>
                    hotkey ? (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-4 px-4 py-1.5 text-sm"
                      >
                        <span>{hotkey.description}</span>
                        <Shortcut
                          keys={hotkey.displayKeys}
                          variant="boxed"
                          className="gap-1"
                        />
                      </div>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
          )}
        </Dialog>
      </Modal>
    );
  },
);
