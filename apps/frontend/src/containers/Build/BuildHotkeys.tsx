import { memo, useEffect } from "react";
import clsx from "clsx";
import { XIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/ui/Dialog";
import { Kbd } from "@/ui/Kbd";
import { Modal } from "@/ui/Modal";
import { useLiveRef } from "@/ui/useLiveRef";
import { isMacOS, MOD, SHIFT } from "@/util/os";

import {
  HotkeysDialogState,
  useBuildHotkeysDialogState,
} from "./BuildHotkeysDialogState";

type HotkeyEnv = "test" | "build" | "media";

export type Hotkey = {
  /**
   * The combination to match, in which "⌘" stands for the platform modifier —
   * Command on macOS, Control everywhere else — and never for a literal key.
   */
  keys: string[];
  /** The same combination as the reader's own keyboard labels it. */
  displayKeys: string[];
  description: string;
  envs: Array<HotkeyEnv>;
};

type HotkeyGroup = {
  name: string;
  hotkeys: Record<string, Hotkey>;
};

const hotkeyGroups = [
  {
    name: "General",
    hotkeys: {
      toggleHotkeysDialog: {
        keys: ["?"],
        displayKeys: ["?"],
        description: "Open this dialog",
        envs: ["test", "build", "media"],
      },
      enterSearchMode: {
        keys: ["⌘", "KeyF"],
        displayKeys: [MOD, "F"],
        description: "Find snapshot",
        envs: ["build"],
      },
      leaveSearchMode: {
        keys: ["Escape"],
        displayKeys: ["Esc"],
        description: "Exit search",
        envs: ["build"],
      },
      toggleFilters: {
        keys: ["KeyF"],
        displayKeys: ["F"],
        description: "Open filters",
        envs: ["build"],
      },
    },
  },
  {
    name: "Navigation",
    hotkeys: {
      startReview: {
        keys: ["Enter"],
        displayKeys: ["↵"],
        description: "Review changes",
        envs: ["build"],
      },
      goToPreviousDiff: {
        keys: ["ArrowUp"],
        displayKeys: ["↑"],
        description: "Go to previous snapshot",
        envs: ["test", "build"],
      },
      goToNextDiff: {
        keys: ["ArrowDown"],
        displayKeys: ["↓"],
        description: "Go to next snapshot",
        envs: ["test", "build"],
      },
      // The same keys as the two above, named apart so the `?` dialog can say
      // "media" where a media page is what the reader is looking at. Only one
      // pair is ever mounted, so they never contend.
      goToPreviousMedia: {
        keys: ["ArrowUp"],
        displayKeys: ["↑"],
        description: "Go to previous media",
        envs: ["media"],
      },
      goToNextMedia: {
        keys: ["ArrowDown"],
        displayKeys: ["↓"],
        description: "Go to next media",
        envs: ["media"],
      },
      toggleDiffGroup: {
        keys: ["KeyG"],
        displayKeys: ["G"],
        description: "Toggle group",
        envs: ["build"],
      },
      goToFirstFailure: {
        keys: ["Digit1"],
        displayKeys: ["1"],
        description: "Go to first failure screenshot",
        envs: ["build"],
      },
      goToFirstChanged: {
        keys: ["Digit2"],
        displayKeys: ["2"],
        description: "Go to first changed snapshot",
        envs: ["build"],
      },
      goToFirstAdded: {
        keys: ["Digit3"],
        displayKeys: ["3"],
        description: "Go to first added snapshot",
        envs: ["build"],
      },
      goToFirstRemoved: {
        keys: ["Digit4"],
        displayKeys: ["4"],
        description: "Go to first removed snapshot",
        envs: ["build"],
      },
      goToFirstUnchanged: {
        keys: ["Digit5"],
        displayKeys: ["5"],
        description: "Go to first unchanged snapshot",
        envs: ["build"],
      },
      goToFirstRetryFailure: {
        keys: ["Digit6"],
        displayKeys: ["6"],
        description: "Go to first retried failure screenshot",
        envs: ["build"],
      },
      goToFirstIgnored: {
        keys: ["Digit7"],
        displayKeys: ["7"],
        description: "Go to first ignored snapshot",
        envs: ["build"],
      },
      switchViewport: {
        keys: ["KeyV"],
        displayKeys: ["V"],
        description: "Switch viewport",
        envs: ["build"],
      },
      switchBrowser: {
        keys: ["KeyB"],
        displayKeys: ["B"],
        description: "Switch browser",
        envs: ["build"],
      },
      switchStoryMode: {
        keys: ["KeyM"],
        displayKeys: ["M"],
        description: "Switch story mode",
        envs: ["build"],
      },
    },
  },
  {
    name: "View",
    hotkeys: {
      toggleChangesOverlay: {
        keys: ["KeyD"],
        displayKeys: ["D"],
        description: "Toggle changes overlay",
        envs: ["test", "build", "media"],
      },
      highlightChanges: {
        keys: ["KeyH"],
        displayKeys: ["H"],
        description: "Highlight changes",
        envs: ["test", "build", "media"],
      },
      goToNextChanges: {
        keys: ["KeyK"],
        displayKeys: ["K"],
        description: "Go to next changes",
        envs: ["test", "build", "media"],
      },
      goToPreviousChanges: {
        keys: ["KeyJ"],
        displayKeys: ["J"],
        description: "Go to previous changes",
        envs: ["test", "build", "media"],
      },
      // A media pair is compared with the same controls as a build's snapshot,
      // so it answers to the same keys. The wording is the build's because the
      // two sides are the same two things: a media's "before" is the baseline
      // it is compared against, and its "after" is what changed.
      showBaseline: {
        keys: ["ArrowLeft"],
        displayKeys: ["←"],
        description: "Show only baseline",
        envs: ["test", "build", "media"],
      },
      showChanges: {
        keys: ["ArrowRight"],
        displayKeys: ["→"],
        description: "Show only changes",
        envs: ["test", "build", "media"],
      },
      showOnion: {
        keys: ["KeyO"],
        displayKeys: ["O"],
        description: "Show onion skin view",
        envs: ["test", "build", "media"],
      },
      showSwipe: {
        keys: ["KeyW"],
        displayKeys: ["W"],
        description: "Show swipe view",
        envs: ["test", "build", "media"],
      },
      toggleSplitView: {
        keys: ["KeyS"],
        displayKeys: ["S"],
        description: "Toggle side by side mode",
        envs: ["test", "build", "media"],
      },
      toggleDiffFit: {
        keys: ["Space"],
        displayKeys: ["Space"],
        description: "Toggle fit to screen",
        envs: ["test", "build"],
      },
      fitView: {
        keys: ["Digit0"],
        displayKeys: ["0"],
        description: "Fit view into screen",
        envs: ["test", "build"],
      },
      toggleSnapshotType: {
        keys: ["KeyL"],
        displayKeys: ["L"],
        description: "Switch between screenshot and aria view",
        envs: ["build"],
      },
      toggleCommentTool: {
        keys: ["KeyC"],
        displayKeys: ["C"],
        description: "Toggle comment tool",
        envs: ["build", "media"],
      },
      showDetails: {
        keys: ["["],
        displayKeys: ["["],
        description: "Show details",
        envs: ["build"],
      },
    },
  },
  {
    name: "Share",
    hotkeys: {
      copyAsSelectedFormat: {
        keys: ["⌘", "KeyC"],
        displayKeys: [MOD, "C"],
        description: "Copy as the selected format",
        envs: ["media"],
      },
      copyMediaLink: {
        keys: ["⌘", "⇧", "Comma"],
        displayKeys: [MOD, SHIFT, ","],
        description: "Copy link",
        envs: ["media"],
      },
      downloadMedia: {
        keys: ["⌘", "⇧", "KeyD"],
        displayKeys: [MOD, SHIFT, "D"],
        description: "Download",
        envs: ["media"],
      },
    },
  },
  {
    name: "Actions",
    hotkeys: {
      requestReviewers: {
        keys: ["KeyA"],
        displayKeys: ["A"],
        description: "Add reviewer",
        envs: ["build"],
      },
      acceptDiff: {
        keys: ["KeyY"],
        displayKeys: ["Y"],
        description: "Mark individual change as accepted",
        envs: ["build"],
      },
      rejectDiff: {
        keys: ["KeyN"],
        displayKeys: ["N"],
        description: "Mark individual change as rejected",
        envs: ["build"],
      },
      ignoreChange: {
        keys: ["KeyI"],
        displayKeys: ["I"],
        description: "Ignore change",
        envs: ["test", "build"],
      },
      undoReviewMark: {
        keys: ["⌘", "KeyZ"],
        displayKeys: [MOD, "Z"],
        description: "Undo last review mark",
        envs: ["build"],
      },
      redoReviewMark: {
        keys: ["⌘", "⇧", "KeyZ"],
        displayKeys: [MOD, SHIFT, "Z"],
        description: "Redo last undone review mark",
        envs: ["build"],
      },
    },
  },
] satisfies HotkeyGroup[];

export type HotkeyName = keyof (typeof hotkeyGroups)[number]["hotkeys"];

const plainHotkeyGroups = hotkeyGroups as unknown as HotkeyGroup[];

const hotkeys = plainHotkeyGroups.reduce(
  (acc, group) => ({ ...acc, ...group.hotkeys }),
  {} as Record<HotkeyName, Hotkey>,
);

function checkIsModifiedPressed(event: KeyboardEvent) {
  if (isMacOS) {
    return event.metaKey;
  }
  return event.ctrlKey;
}

/**
 * Whether shift counts as pressed for `hotkey`.
 *
 * Shift is only meaningful for hotkeys written as physical codes (`KeyZ`,
 * `Digit1`, `ArrowUp`…), where the declared `⇧` is the only thing that can
 * demand it. Hotkeys written as literal characters ("?", "[") already carry
 * the answer in `event.key` — "?" *is* shift+/ — so demanding a matching
 * `shiftKey` would make them impossible to type.
 */
function checkIsShiftPressed(hotkey: Hotkey, event: KeyboardEvent): boolean {
  const isLiteralKey = hotkey.keys.some(
    (key) => key !== "⌘" && key !== "⌥" && key !== "⇧" && key.length === 1,
  );
  return isLiteralKey ? false : event.shiftKey;
}

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
 * Whether `event` matches `hotkey`'s key combination (modifiers included).
 */
function checkHotkeyMatches(hotkey: Hotkey, event: KeyboardEvent): boolean {
  const modifierShouldBePressed = hotkey.keys.some((key) => key === "⌘");
  const altShouldBePressed = hotkey.keys.some((key) => key === "⌥");
  const shiftShouldBePressed = hotkey.keys.some((key) => key === "⇧");
  const hasDigits = hotkey.keys.some((key) => key.startsWith("Digit"));

  if (hasDigits && altShouldBePressed !== event.altKey) {
    return false;
  }

  if (modifierShouldBePressed !== checkIsModifiedPressed(event)) {
    return false;
  }

  if (shiftShouldBePressed !== checkIsShiftPressed(hotkey, event)) {
    return false;
  }

  return hotkey.keys.every((key) => {
    // Ignore modifier keys
    if (key === "⌘" || key === "⇧") {
      return true;
    }
    if (key.startsWith("Key")) {
      const letter = key.slice(3);
      return letter === event.key || letter.toLowerCase() === event.key;
    }
    return key === event.code || key === event.key;
  });
}

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
  const hotkey = hotkeys[name];
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
                const entries = Object.entries(group.hotkeys).filter(
                  ([, hotKey]) =>
                    hotKey.description && hotKey.envs.includes(env),
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
