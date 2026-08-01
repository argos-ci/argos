import { memo } from "react";
import { useAtom } from "jotai/react";
import { EyeIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { useBuildHotkey } from "../BuildHotkeys";
import { overlayVisibleAtom } from "../OverlayStyle";

export const OverlayToggle = memo(() => {
  const [visible, setVisible] = useAtom(overlayVisibleAtom);
  const toggle = () => setVisible((visible) => !visible);
  const hotkey = useBuildHotkey("toggleChangesOverlay", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={visible ? "Hide changes overlay" : "Show changes overlay"}
      keys={hotkey.displayKeys}
    >
      <Button variant="danger" iconOnly aria-pressed={visible} onPress={toggle}>
        <EyeIcon />
      </Button>
    </HotkeyTooltip>
  );
});
