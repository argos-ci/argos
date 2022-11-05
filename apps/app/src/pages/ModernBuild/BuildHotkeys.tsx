import { memo } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogHeader,
  DialogTitle,
  useDialogState,
} from "@/modern/ui/Dialog";

// interface HotKey {
//   keys: string[];
//   displayKeys: string[];
//   description?: string;
// }

export const hotkeys = {
  // toggleChangesOverlay: {
  //   keys: "H",
  //   description: "Show/Hide changes overlay",
  // },
  // toggleContainedScreenshots: {
  //   keys: "space",
  //   description: "Enlarge/Shrink screenshots",
  // },
  // previousDiff: { keys: "up, left", description: "Previous screenshot" },
  // nextDiff: { keys: "down, right", description: "Next screenshot" },
  // goToFirstSection: {
  //   keys: "1, shift+1",
  //   keysLabel: "1, 2, 3, 4, 5",
  //   description: "Go to section X",
  // },
  // goToSecondSection: {
  //   keys: "2, shift+2",
  // },
  // goToThirdSection: {
  //   keys: "3, shift+3",
  // },
  // goToFourthSection: {
  //   keys: "4, shift+4",
  // },
  // goToFifthSection: {
  //   keys: "5, shift+5",
  // },
  toggleHotkeysDialog: {
    keys: ["?", "shift+?"],
    displayKeys: ["?"],
    description: "Open this dialog",
  },
};

export const useBuildHotkeys = (
  name: keyof typeof hotkeys,
  callback: Parameters<typeof useHotkeys>[1],
  options?: Parameters<typeof useHotkeys>[2]
) => {
  useHotkeys(hotkeys[name].keys, callback, options);
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-700 text-xs text-slate-200">
    {children}
  </kbd>
);

export const BuildHotkeysDialog = memo(() => {
  const dialog = useDialogState();
  useBuildHotkeys("toggleHotkeysDialog", () => {
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
                  <div className="flex gap-2">
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
