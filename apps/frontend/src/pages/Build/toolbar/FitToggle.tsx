import { memo } from "react";
import { ShrinkIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildDiffFitState } from "../BuildDiffFitState";
import { useBuildHotkey } from "../BuildHotkeys";
import { useZoomerSyncContext } from "../Zoomer";

export const FitToggle = memo(() => {
  const { contained, setContained } = useBuildDiffFitState();
  const { reset } = useZoomerSyncContext();
  const toggle = () => {
    setContained((contained) => !contained);
    reset();
  };
  const hotkey = useBuildHotkey("toggleDiffFit", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={contained ? "Expand the screenshot" : "Fit the screenshot"}
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={contained} onPress={toggle}>
        <ShrinkIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
