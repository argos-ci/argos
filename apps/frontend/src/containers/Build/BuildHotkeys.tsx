import { memo, useEffect, useMemo, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/ui/Dialog";
import { Modal } from "@/ui/Modal";
import { Shortcut } from "@/ui/Shortcut";
import { useLiveRef } from "@/ui/useLiveRef";
import { type ModifierKey } from "@/util/os";

import {
  HotkeysDialogState,
  useBuildHotkeysDialogState,
} from "./BuildHotkeysDialogState";
import {
  checkHotkeyMatches,
  checkHotkeyMatchesSearch,
  checkHotkeyUsesModifiers,
  getHotkey,
  getModifierLabel,
  plainHotkeyGroups,
  SEARCHABLE_MODIFIERS,
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

type ListedHotkey = { id: string; hotkey: Hotkey };

type ListedItem =
  | ({ kind: "hotkey" } & ListedHotkey)
  | { kind: "section"; id: string; name: string; hotkeys: ListedHotkey[] };

function listGroup(
  group: HotkeyGroup,
  env: HotkeyEnv,
  query: string,
  modifiers: ModifierKey[],
): ListedItem[] {
  const items: ListedItem[] = [];
  const sections = new Map<string, Extract<ListedItem, { kind: "section" }>>();
  for (const [id, hotkey] of Object.entries(group.hotkeys)) {
    if (!hotkey || !hotkey.envs.includes(env)) {
      continue;
    }
    if (
      !checkHotkeyUsesModifiers(hotkey, modifiers) ||
      !checkHotkeyMatchesSearch(hotkey, query)
    ) {
      continue;
    }
    if (hotkey.section === undefined) {
      items.push({ kind: "hotkey", id, hotkey });
      continue;
    }
    const open = sections.get(hotkey.section);
    if (open) {
      open.hotkeys.push({ id, hotkey });
      continue;
    }
    const section = {
      kind: "section" as const,
      id: hotkey.section,
      name: hotkey.section,
      hotkeys: [{ id, hotkey }],
    };
    sections.set(hotkey.section, section);
    items.push(section);
  }
  return items;
}

function HotkeyRow(props: { hotkey: Hotkey }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{props.hotkey.description}</span>
      <Shortcut
        keys={props.hotkey.displayKeys}
        variant="boxed"
        className="gap-1"
      />
    </div>
  );
}

/**
 * A modifier cannot be typed into a search box — ⌘ is not a character on the
 * keyboard it is being typed from — so it is pressed rather than spelled.
 */
function ShortcutSearchField(props: {
  query: string;
  onQueryChange: (query: string) => void;
  modifiers: ModifierKey[];
  onToggleModifier: (modifier: ModifierKey) => void;
}) {
  const { query, onQueryChange, modifiers, onToggleModifier } = props;
  return (
    <div className="border-thin bg-app focus-within:border-active mb-4 flex items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-3">
      <SearchIcon className="text-placeholder size-4 shrink-0" />
      <input
        type="search"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        aria-label="Search shortcuts"
        placeholder="Search shortcuts"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="text-default placeholder:text-placeholder search-cancel:hidden min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      <div className="flex shrink-0 items-center gap-1">
        {SEARCHABLE_MODIFIERS.map((modifier) => (
          <Button
            key={modifier}
            variant="secondary"
            size="small"
            aria-pressed={modifiers.includes(modifier)}
            aria-label={getModifierLabel(modifier)}
            onClick={() => onToggleModifier(modifier)}
          >
            {modifier}
          </Button>
        ))}
      </div>
    </div>
  );
}

const BuildHotkeysDialogWithState = memo(
  (props: { state: HotkeysDialogState; env: HotkeyEnv }) => {
    const { env, state } = props;
    const [query, setQuery] = useState("");
    const [modifiers, setModifiers] = useState<ModifierKey[]>([]);
    useBuildHotkey("toggleHotkeysDialog", () =>
      state.setIsOpen((value) => !value),
    );
    const groups = useMemo(() => {
      const search = query.trim();
      return plainHotkeyGroups.flatMap((group) => {
        const items = listGroup(group, env, search, modifiers);
        return items.length > 0 ? [{ name: group.name, items }] : [];
      });
    }, [env, query, modifiers]);
    return (
      <Modal
        open={state.isOpen}
        onOpenChange={(open) => {
          state.setIsOpen(open);
          if (!open) {
            setQuery("");
            setModifiers([]);
          }
        }}
        dismissible
      >
        <Dialog className="w-3xl">
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
            <ShortcutSearchField
              query={query}
              onQueryChange={setQuery}
              modifiers={modifiers}
              onToggleModifier={(modifier) =>
                setModifiers((current) =>
                  current.includes(modifier)
                    ? current.filter((value) => value !== modifier)
                    : [...current, modifier],
                )
              }
            />
            {groups.length === 0 ? (
              <div className="text-low py-8 text-center text-sm">
                No shortcut matches.
              </div>
            ) : (
              <div className="gap-8 text-sm md:columns-2">
                {groups.map((group) => (
                  <div
                    key={group.name}
                    className="mb-6 break-inside-avoid-column last:mb-0"
                  >
                    <h3 className="text-low mb-2 text-xs font-medium">
                      {group.name}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {group.items.map((item) =>
                        item.kind === "section" ? (
                          // The negative margin cancels the tint's own
                          // padding, so its rows stay on the columns the
                          // plain rows sit on.
                          <div
                            key={item.id}
                            className="bg-subtle -mx-2.5 my-1 break-inside-avoid rounded-lg px-2.5 py-2"
                          >
                            <div className="text-low mb-1 text-xs">
                              {item.name}
                            </div>
                            <div className="flex flex-col gap-2">
                              {item.hotkeys.map((listed) => (
                                <HotkeyRow
                                  key={listed.id}
                                  hotkey={listed.hotkey}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <HotkeyRow key={item.id} hotkey={item.hotkey} />
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
