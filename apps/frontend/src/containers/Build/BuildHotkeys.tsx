import { memo, useEffect } from "react";
import clsx from "clsx";
import { XIcon } from "lucide-react";

import { Dialog, DialogBody, DialogTitle } from "@/ui/Dialog";
import { IconButton } from "@/ui/IconButton";
import { Modal } from "@/ui/Modal";
import { useLiveRef } from "@/ui/useLiveRef";

import {
  HotkeysDialogState,
  useBuildHotkeysDialogState,
} from "./BuildHotkeysDialogState";

type HotkeyEnv = "test" | "build";

export type Hotkey = {
  keys: string[];
  displayKeys: string[];
  description: string;
  envs: Array<HotkeyEnv>;
};

type HotkeyGroup = {
  name: string;
  hotkeys: Record<string, Hotkey>;
};

const isMacOS = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const hotkeyGroups = [
  {
    name: "General",
    hotkeys: {
      toggleHotkeysDialog: {
        keys: ["?"],
        displayKeys: ["?"],
        description: "Open this dialog",
        envs: ["test", "build"],
      },
      enterSearchMode: {
        keys: ["⌘", "KeyF"],
        displayKeys: ["⌘", "F"],
        description: "Find screenshot",
        envs: ["build"],
      },
      leaveSearchMode: {
        keys: ["Escape"],
        displayKeys: ["Esc"],
        description: "Exit search",
        envs: ["build"],
      },
    },
  },
  {
    name: "Navigation",
    hotkeys: {
      goToPreviousDiff: {
        keys: ["ArrowUp"],
        displayKeys: ["↑"],
        description: "Go to previous screenshot",
        envs: ["test", "build"],
      },
      goToNextDiff: {
        keys: ["ArrowDown"],
        displayKeys: ["↓"],
        description: "Go to next screenshot",
        envs: ["test", "build"],
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
        description: "Go to first changed screenshot",
        envs: ["build"],
      },
      goToFirstAdded: {
        keys: ["Digit3"],
        displayKeys: ["3"],
        description: "Go to first added screenshot",
        envs: ["build"],
      },
      goToFirstRemoved: {
        keys: ["Digit4"],
        displayKeys: ["4"],
        description: "Go to first removed screenshot",
        envs: ["build"],
      },
      goToFirstUnchanged: {
        keys: ["Digit5"],
        displayKeys: ["5"],
        description: "Go to first unchanged screenshot",
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
        description: "Go to first ignored screenshot",
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
    },
  },
  {
    name: "View",
    hotkeys: {
      toggleChangesOverlay: {
        keys: ["KeyD"],
        displayKeys: ["D"],
        description: "Toggle changes overlay",
        envs: ["test", "build"],
      },
      highlightChanges: {
        keys: ["KeyH"],
        displayKeys: ["H"],
        description: "Highlight changes",
        envs: ["test", "build"],
      },
      goToNextChanges: {
        keys: ["KeyK"],
        displayKeys: ["K"],
        description: "Go to next changes",
        envs: ["test", "build"],
      },
      goToPreviousChanges: {
        keys: ["KeyJ"],
        displayKeys: ["J"],
        description: "Go to previous changes",
        envs: ["test", "build"],
      },
      showBaseline: {
        keys: ["ArrowLeft"],
        displayKeys: ["←"],
        description: "Show only baseline",
        envs: ["test", "build"],
      },
      showChanges: {
        keys: ["ArrowRight"],
        displayKeys: ["→"],
        description: "Show only changes",
        envs: ["test", "build"],
      },
      toggleSplitView: {
        keys: ["KeyS"],
        displayKeys: ["S"],
        description: "Toggle side by side mode",
        envs: ["test", "build"],
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
    },
  },
  {
    name: "Actions",
    hotkeys: {
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

export function useBuildHotkey(
  name: HotkeyName,
  callback: (event: KeyboardEvent) => void,
  options?: {
    preventDefault?: boolean;
    enabled?: boolean;
    allowInInput?: boolean;
  },
): Hotkey {
  const hotkey = hotkeys[name];
  const {
    preventDefault = true,
    enabled = true,
    allowInInput = false,
  } = options ?? {};
  const optionsWithDefaults = { preventDefault, enabled, allowInInput };
  const refs = useLiveRef({ callback, options: optionsWithDefaults });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const { options, callback } = refs.current;

      // If the element has a modal as ancestor, it means a modal is open (because of focus trap).
      // So by doing that we ignore all hotkeys when a modal is open.
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-modal]")
      ) {
        return;
      }

      if (!options.enabled) {
        return;
      }

      if (
        document.getElementById("root")?.getAttribute("aria-hidden") === "true"
      ) {
        return;
      }

      // Ignore key events from menu & menuitem elements
      if (
        event.target instanceof HTMLElement &&
        (event.target.role === "menu" || event.target.role === "menuitem")
      ) {
        return;
      }

      if (!options.allowInInput && event.target instanceof HTMLInputElement) {
        if (event.target.type === "text") {
          return;
        }
        if (event.target.type === "textarea") {
          return;
        }
      }

      const modifierShouldBePressed = hotkey.keys.some((key) => key === "⌘");

      if (modifierShouldBePressed !== checkIsModifiedPressed(event)) {
        return;
      }

      const matchKeys = hotkey.keys.every((key) => {
        // Ignore modifier keys
        if (key === "⌘") {
          return true;
        }
        if (key.startsWith("Key")) {
          const letter = key.slice(3);
          return letter === event.key || letter.toLowerCase() === event.key;
        }
        return key === event.code || key === event.key;
      });

      if (!matchKeys) {
        return;
      }

      if (options.preventDefault) {
        event.preventDefault();
      }

      callback(event);
    };
    document.addEventListener("keydown", listener, { capture: true });
    return () => {
      document.removeEventListener("keydown", listener, { capture: true });
    };
  }, [hotkey, refs]);
  return hotkey;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-ui inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-xs">
      {children}
    </kbd>
  );
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
      <Modal isOpen={state.isOpen} onOpenChange={state.setIsOpen} isDismissable>
        <Dialog>
          <DialogBody>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <IconButton
              slot="close"
              aria-label="Close"
              className="absolute top-3 right-3 z-10"
            >
              <XIcon />
            </IconButton>
            <div
              className={clsx(
                "gap-12 space-y-6 md:columns-2",
                { test: "md:max-h-[20rem]", build: "md:max-h-[32rem]" }[env],
              )}
              style={{ columnFill: "auto" }}
            >
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
