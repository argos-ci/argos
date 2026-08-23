import { memo, useEffect } from "react";
import clsx from "clsx";
import { XIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/ui/Dialog";
import { Kbd } from "@/ui/Kbd";
import { Modal } from "@/ui/Modal";
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

const BuildHotkeysDialogWithState = memo(
  (props: { state: HotkeysDialogState; env: HotkeyEnv }) => {
    const { env, state } = props;
    useBuildHotkey("toggleHotkeysDialog", () =>
      state.setIsOpen((value) => !value),
    );
    return (
      <Modal open={state.isOpen} onOpenChange={state.setIsOpen} dismissible>
        <Dialog>
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
            <div className={clsx("gap-12 space-y-6 pb-4 md:columns-2")}>
              {plainHotkeyGroups.map((group, index) => {
                const entries = Object.entries(group.hotkeys).flatMap(
                  ([name, hotKey]) =>
                    hotKey?.description && hotKey.envs.includes(env)
                      ? [[name, hotKey] as const]
                      : [],
                );
                if (entries.length === 0) {
                  return null;
                }
                return (
                  <div key={index} className="break-inside-avoid-column">
                    <h3 className="mb-2 text-sm font-medium">{group.name}</h3>
                    <div className="flex flex-col gap-2">
                      {entries.map(([name, hotKey]) => {
                        return (
                          <div key={name} className="flex items-center gap-2">
                            <div className="w-72 text-sm">
                              {hotKey.description}
                            </div>
                            <div className="flex flex-1 justify-end gap-2">
                              {hotKey.displayKeys.map((key) => (
                                <Kbd key={key}>{key}</Kbd>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogBody>
        </Dialog>
      </Modal>
    );
  },
);
