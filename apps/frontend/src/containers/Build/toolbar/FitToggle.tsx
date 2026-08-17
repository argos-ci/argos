import { memo, startTransition } from "react";
import { useAtom } from "jotai/react";
import { ExpandIcon, ShrinkIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

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
      {/* The icon says which way the button goes, so it needs no pressed
          state on top: shrink to fit, expand back to full size. */}
      <Button variant="secondary" iconOnly onClick={toggle}>
        {contained ? <ExpandIcon /> : <ShrinkIcon />}
      </Button>
    </HotkeyTooltip>
  );
});
