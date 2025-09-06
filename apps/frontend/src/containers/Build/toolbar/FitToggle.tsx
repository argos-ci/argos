import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import { ShrinkIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { buildDiffFitContainedAtom } from "../BuildDiffFit";
import { useBuildHotkey } from "../BuildHotkeys";
import { useZoomerSyncContext } from "../Zoomer";

export const FitToggle = memo(() => {
  const [contained, setContained] = useAtom(buildDiffFitContainedAtom);
  const { reset } = useZoomerSyncContext();
  const toggle = () => {
    startTransition(() => {
      setContained((contained) => !contained);
    });
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
