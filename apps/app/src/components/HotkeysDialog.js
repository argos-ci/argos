import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/solid";
import { x } from "@xstyled/styled-components";

import {
  Dialog,
  DialogDismiss,
  DialogHeader,
  Hotkey,
  HotkeySeparator,
} from "@/components";

function ShortcutIcon({ shortcut }) {
  switch (shortcut) {
    case "up":
      return <ArrowUpIcon />;
    case "down":
      return <ArrowDownIcon />;
    case "left":
      return <ArrowLeftIcon />;
    case "right":
      return <ArrowRightIcon />;

    default:
      return <>{shortcut}</>;
  }
}

export const HotkeysDialog = ({ state, hotkeys }) => {
  return (
    <Dialog state={state}>
      <DialogHeader>
        <x.h1 fontSize="xl">Keyboard shortcuts</x.h1>
        <DialogDismiss />
      </DialogHeader>

      <x.div display="flex" flexDirection="column" gap={2}>
        {Object.keys(hotkeys)
          .filter((k) => hotkeys[k].description)
          .map((k) => {
            return (
              <x.div key={k} display="flex" alignItems="center" gap={2}>
                {(hotkeys[k].shortcutLabel || hotkeys[k].shortcut || "")
                  .split(",")
                  .map((shortcut) => (
                    <Hotkey key={shortcut}>
                      <ShortcutIcon shortcut={shortcut.trim()} />
                    </Hotkey>
                  ))}

                <HotkeySeparator />
                <div>{hotkeys[k].description}</div>
              </x.div>
            );
          })}
      </x.div>
    </Dialog>
  );
};
