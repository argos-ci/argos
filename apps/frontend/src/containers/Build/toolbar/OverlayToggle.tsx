import { memo, type ReactNode, type SetStateAction } from "react";
import { useAtom, type WritableAtom } from "jotai";
import { EyeIcon, MoveVerticalIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { useBuildHotkey } from "../BuildHotkeys";
import type { HotkeyName } from "../hotkeys";
import { layoutShiftVisibleAtom, overlayVisibleAtom } from "../OverlayStyle";

/** Shows or hides a part of the overlay, a preference kept in `atom`. */
function OverlayPartToggle(props: {
  atom: WritableAtom<boolean, [SetStateAction<boolean>], void>;
  hotkey: HotkeyName;
  /** What the overlay part is called, as in "Show <name>". */
  name: string;
  icon: ReactNode;
}) {
  const { atom, hotkey: hotkeyName, name, icon } = props;
  const [visible, setVisible] = useAtom(atom);
  const toggle = () => setVisible((visible) => !visible);
  const hotkey = useBuildHotkey(hotkeyName, toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={visible ? `Hide ${name}` : `Show ${name}`}
      keys={hotkey.displayKeys}
    >
      <Button
        variant="danger"
        iconOnly
        aria-label={name.charAt(0).toUpperCase() + name.slice(1)}
        aria-pressed={visible}
        onClick={toggle}
      >
        {icon}
      </Button>
    </HotkeyTooltip>
  );
}

export const OverlayToggle = memo(() => (
  <OverlayPartToggle
    atom={overlayVisibleAtom}
    hotkey="toggleChangesOverlay"
    name="changes overlay"
    icon={<EyeIcon />}
  />
));

export const LayoutShiftToggle = memo(() => (
  <OverlayPartToggle
    atom={layoutShiftVisibleAtom}
    hotkey="toggleLayoutShift"
    name="layout shift"
    icon={<MoveVerticalIcon />}
  />
));
