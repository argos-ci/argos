import { memo, useEffect } from "react";

import { Dialog, DialogBody, DialogTitle } from "@/ui/Dialog";
import { Modal } from "@/ui/Modal";
import { useLiveRef } from "@/ui/useLiveRef";

import { HotkeysDialogState } from "./BuildHotkeysDialogState";

export type Hotkey = {
  keys: string[];
  displayKeys: string[];
  description: string;
};

type HotkeyGroup = {
  name: string;
  hotkeys: Record<string, Hotkey>;
};

const isMacOS = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const hotkeyGroups = [
  {
    name: "Navigation",
    hotkeys: {
      goToPreviousDiff: {
        keys: ["ArrowUp"],
        displayKeys: ["↑"],
        description: "Go to previous screenshot",
      },
      goToNextDiff: {
        keys: ["ArrowDown"],
        displayKeys: ["↓"],
        description: "Go to next screenshot",
      },
      toggleDiffGroup: {
        keys: ["KeyG"],
        displayKeys: ["G"],
        description: "Toggle group",
      },
      goToFirstFailure: {
        keys: ["Digit1"],
        displayKeys: ["1"],
        description: "Go to first failure screenshot",
      },
      goToFirstChanged: {
        keys: ["Digit2"],
        displayKeys: ["2"],
        description: "Go to first changed screenshot",
      },
      goToFirstAdded: {
        keys: ["Digit3"],
        displayKeys: ["3"],
        description: "Go to first added screenshot",
      },
      goToFirstRemoved: {
        keys: ["Digit4"],
        displayKeys: ["4"],
        description: "Go to first removed screenshot",
      },
      goToFirstUnchanged: {
        keys: ["Digit5"],
        displayKeys: ["5"],
        description: "Go to first unchanged screenshot",
      },
      goToFirstRetryFailure: {
        keys: ["Digit6"],
        displayKeys: ["6"],
        description: "Go to first retried failure screenshot",
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
      },
      showBaseline: {
        keys: ["ArrowLeft"],
        displayKeys: ["←"],
        description: "Show only baseline",
      },
      showChanges: {
        keys: ["ArrowRight"],
        displayKeys: ["→"],
        description: "Show only changes",
      },
      toggleSplitView: {
        keys: ["KeyS"],
        displayKeys: ["S"],
        description: "Toggle side by side mode",
      },
      toggleDiffFit: {
        keys: ["Space"],
        displayKeys: ["Space"],
        description: "Toggle fit to screen",
      },
      fitView: {
        keys: ["Digit0"],
        displayKeys: ["0"],
        description: "Fit view into screen",
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
      },
      rejectDiff: {
        keys: ["KeyN"],
        displayKeys: ["N"],
        description: "Mark individual change as rejected",
      },
    },
  },
  {
    name: "General",
    hotkeys: {
      toggleHotkeysDialog: {
        keys: ["?"],
        displayKeys: ["?"],
        description: "Open this dialog",
      },
      enterSearchMode: {
        keys: ["⌘", "KeyF"],
        displayKeys: ["⌘", "F"],
        description: "Find screenshot",
      },
      leaveSearchMode: {
        keys: ["Escape"],
        displayKeys: ["Esc"],
        description: "Exit search",
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

      if (!options.enabled) {
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
    <kbd className="bg-ui inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs">
      {children}
    </kbd>
  );
}

export const BuildHotkeysDialog = memo(
  (props: { state: HotkeysDialogState }) => {
    useBuildHotkey("toggleHotkeysDialog", () =>
      props.state.setIsOpen((value) => !value),
    );
    return (
      <Modal
        isOpen={props.state.isOpen}
        onOpenChange={props.state.setIsOpen}
        isDismissable
      >
        <Dialog>
          <DialogBody>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <div
              className="gap-12 space-y-6 md:max-h-[500px] md:columns-2"
              style={{ columnFill: "auto" }}
            >
              {plainHotkeyGroups.map((group, index) => {
                return (
                  <div key={index} className="break-inside-avoid-column">
                    <h3 className="mb-2 text-sm font-medium">{group.name}</h3>
                    <div className="flex flex-col gap-2">
                      {Object.entries(group.hotkeys)
                        .filter(([, hotKey]) => hotKey.description)
                        .map(([name, hotKey]) => {
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
