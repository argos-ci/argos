import { memo } from "react";
import { useAtom } from "jotai/react";
import { EyeIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

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
      <IconButton color="danger" aria-pressed={visible} onPress={toggle}>
        <EyeIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
