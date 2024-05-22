import { memo } from "react";
import { EyeIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildDiffVisibleState } from "../BuildDiffVisibleState";
import { useBuildHotkey } from "../BuildHotkeys";

export const OverlayToggle = memo(() => {
  const { visible, setVisible } = useBuildDiffVisibleState();
  const toggle = () => setVisible((visible) => !visible);
  const hotkey = useBuildHotkey("toggleChangesOverlay", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={visible ? "Hide changes overlay" : "Show changes overlay"}
      keys={hotkey.displayKeys}
    >
      <IconButton color="danger" aria-pressed={visible} onPress={toggle}>
        <EyeIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
