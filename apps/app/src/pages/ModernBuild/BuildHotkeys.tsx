import { memo, useEffect, useLayoutEffect, useRef } from "react";

import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogHeader,
  DialogTitle,
  useDialogState,
} from "@/modern/ui/Dialog";

interface Hotkey {
  keys: string[];
  displayKeys: string[];
  description: string;
}

const isMacOS = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

export const hotkeys = {
  goToFirstFailure: {
    keys: ["Digit1"],
    displayKeys: ["1"],
    description: "Go to first failure screenshot",
  } as Hotkey,
  goToFirstChanged: {
    keys: ["Digit2"],
    displayKeys: ["2"],
    description: "Go to first changed screenshot",
  } as Hotkey,
  goToFirstAdded: {
    keys: ["Digit3"],
    displayKeys: ["3"],
    description: "Go to first added screenshot",
  } as Hotkey,
  goToFirstRemoved: {
    keys: ["Digit4"],
    displayKeys: ["4"],
    description: "Go to first removed screenshot",
  } as Hotkey,
  goToFirstUnchanged: {
    keys: ["Digit5"],
    displayKeys: ["5"],
    description: "Go to first unchanged screenshot",
  } as Hotkey,
  toggleSidebarPanel: {
    keys: ["⌘", "KeyB"],
    displayKeys: isMacOS ? ["⌘", "B"] : ["Ctrl", "B"],
    description: "Toggle info/screenshots sidebar panel",
  } as Hotkey,
  goToNextDiff: {
    keys: ["ArrowDown"],
    displayKeys: ["↓"],
    description: "Go to next screenshot",
  } as Hotkey,
  goToPreviousDiff: {
    keys: ["ArrowUp"],
    displayKeys: ["↑"],
    description: "Go to previous screenshot",
  } as Hotkey,
  toggleChangesOverlay: {
    keys: ["KeyD"],
    displayKeys: ["D"],
    description: "Toggle changes overlay",
  } as Hotkey,
  toggleDiffFit: {
    keys: ["Space"],
    displayKeys: ["Space"],
    description: "Toggle fit to screen",
  } as Hotkey,
  toggleHotkeysDialog: {
    keys: ["?"],
    displayKeys: ["?"],
    description: "Open this dialog",
  } as Hotkey,
};

export type HotkeyName = keyof typeof hotkeys;

export const useBuildHotkey = (
  name: HotkeyName,
  callback: (event: KeyboardEvent) => void,
  options?: {
    preventDefault?: boolean;
    enabled?: boolean;
  }
) => {
  const hotkey = hotkeys[name];
  const { preventDefault = true, enabled = true } = options ?? {};
  const optionsWithDefaults = { preventDefault, enabled };
  const refs = useRef({ callback, options: optionsWithDefaults });
  useLayoutEffect(() => {
    refs.current.callback = callback;
    refs.current.options = optionsWithDefaults;
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const { options, callback } = refs.current;
      if (!options.enabled) return;
      const matchKeys = hotkey.keys.every((key) => {
        if (key === "⌘") {
          if (isMacOS && event.metaKey) return true;
          if (!isMacOS && event.ctrlKey) return true;
          return false;
        }
        return key === event.code || key === event.key;
      });
      if (!matchKeys) return;
      if (options.preventDefault) event.preventDefault();
      callback(event);
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [hotkey]);
  return hotkey;
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-slate-700 px-1 text-xs text-slate-200">
    {children}
  </kbd>
);

export const BuildHotkeysDialog = memo(() => {
  const dialog = useDialogState();
  useBuildHotkey("toggleHotkeysDialog", () => {
    dialog.toggle();
  });
  return (
    <Dialog state={dialog}>
      <DialogHeader>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogDismiss />
      </DialogHeader>

      <DialogBody>
        <div className="flex flex-col gap-2">
          {Object.entries(hotkeys)
            .filter(([, hotKey]) => hotKey.description)
            .map(([name, hotKey]) => {
              return (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-[400px] text-sm font-medium">
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
      </DialogBody>
    </Dialog>
  );
});
