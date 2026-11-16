import { memo } from "react";
import { useAtom } from "jotai/react";
import { MoveVerticalIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { useBuildHotkey } from "../BuildHotkeys";
import { layoutShiftVisibleAtom } from "../OverlayStyle";

export const LayoutShiftToggle = memo(() => {
  const [visible, setVisible] = useAtom(layoutShiftVisibleAtom);
  const toggle = () => setVisible((visible) => !visible);
  const hotkey = useBuildHotkey("toggleLayoutShift", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={visible ? "Hide layout shift" : "Show layout shift"}
      keys={hotkey.displayKeys}
    >
      <Button
        variant="danger"
        iconOnly
        aria-label="Layout shift"
        aria-pressed={visible}
        onClick={toggle}
      >
        <MoveVerticalIcon />
      </Button>
    </HotkeyTooltip>
  );
});
