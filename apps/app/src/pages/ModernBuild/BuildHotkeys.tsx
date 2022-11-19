import { memo, useLayoutEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

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
    keys: ["1", "shift+1"],
    displayKeys: ["1"],
    description: "Go to first failure screenshot",
  },
  goToFirstChanged: {
    keys: ["2", "shift+2"],
    displayKeys: ["2"],
    description: "Go to first changed screenshot",
  },
  goToFirstAdded: {
    keys: ["3", "shift+3"],
    displayKeys: ["3"],
    description: "Go to first added screenshot",
  },
  goToFirstRemoved: {
    keys: ["4", "shift+4"],
    displayKeys: ["4"],
    description: "Go to first removed screenshot",
  },
  goToFirstUnchanged: {
    keys: ["5", "shift+5"],
    displayKeys: ["5"],
    description: "Go to first unchanged screenshot",
  },
  toggleSidebarPanel: {
    keys: ["meta+b"],
    displayKeys: isMacOS ? ["⌘", "B"] : ["Ctrl", "B"],
    description: "Toggle info/screenshots sidebar panel",
  } as Hotkey,
  goToNextDiff: {
    keys: ["down"],
    displayKeys: ["↓"],
    description: "Go to next screenshot",
  } as Hotkey,
  goToPreviousDiff: {
    keys: ["up"],
    displayKeys: ["↑"],
    description: "Go to previous screenshot",
  } as Hotkey,
  toggleChangesOverlay: {
    keys: ["d"],
    displayKeys: ["D"],
    description: "Toggle changes overlay",
  } as Hotkey,
  toggleDiffFit: {
    keys: ["space"],
    displayKeys: ["Space"],
    description: "Toggle fit to screen",
  } as Hotkey,
  toggleHotkeysDialog: {
    keys: ["?", "shift+?"],
    displayKeys: ["?"],
    description: "Open this dialog",
  } as Hotkey,
};

export type HotkeyName = keyof typeof hotkeys;

export const useBuildHotkey = (
  name: HotkeyName,
  callback: Parameters<typeof useHotkeys>[1],
  options?: Parameters<typeof useHotkeys>[2]
) => {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  useHotkeys(
    hotkeys[name].keys,
    (...events) => {
      callbackRef.current(...events);
    },
    options
  );
  return hotkeys[name];
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
