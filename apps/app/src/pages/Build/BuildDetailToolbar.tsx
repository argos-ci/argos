import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsPointingInIcon,
  EyeIcon,
} from "@heroicons/react/20/solid";
import { memo } from "react";

import { HotkeyTooltip } from "@/modern/ui/HotkeyTooltip";
import { IconButton } from "@/modern/ui/IconButton";

import { useBuildDiffFitState } from "./BuildDiffFitState";
import { useBuildDiffState } from "./BuildDiffState";
import { useBuildDiffVisibleState } from "./BuildDiffVisibleState";
import { useBuildHotkey } from "./BuildHotkeys";
import { clsx } from "clsx";

const BuildDiffChangesOverlayToggle = memo(() => {
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
      <IconButton color="danger" aria-pressed={visible} onClick={toggle}>
        <EyeIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const BuildDiffFitToggle = memo(() => {
  const { contained, setContained } = useBuildDiffFitState();
  const toggle = () => setContained((contained) => !contained);
  const hotkey = useBuildHotkey("toggleDiffFit", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={contained ? "Expand the screenshot" : "Fit the screenshot"}
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={contained} onClick={toggle}>
        <ArrowsPointingInIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const NextDiffButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex >= diffs.length - 1;
  const goToNextDiff = () => {
    if (disabled) return;
    const nextDiff = diffs[activeDiffIndex + 1];
    if (nextDiff) {
      setActiveDiff(nextDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToNextDiff", goToNextDiff, {
    preventDefault: true,
    enabled: !disabled,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToNextDiff}>
        <ArrowDownIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const PreviousDiffButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex <= 0;
  const goToPreviousDiff = () => {
    if (disabled) return;
    const previousDiff = diffs[activeDiffIndex - 1];
    if (previousDiff) {
      setActiveDiff(previousDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToPreviousDiff", goToPreviousDiff, {
    preventDefault: true,
    enabled: !disabled,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToPreviousDiff}>
        <ArrowUpIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

export interface BuildDetailToolbarProps {
  name: string;
  bordered: boolean;
}

export const BuildDetailToolbar = memo(
  ({ name, bordered }: BuildDetailToolbarProps) => {
    const borderClassName = bordered
      ? "border-b-border"
      : "border-b-transparent";
    return (
      <div
        className={clsx(
          borderClassName,
          "b sticky top-0 z-20 flex flex-shrink-0 justify-between gap-4 border-b bg-black/80 p-4 backdrop-blur-[5px] backdrop-saturate-[180%] transition-colors"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <PreviousDiffButton />
            <NextDiffButton />
          </div>
          <div role="heading" className="text-sm font-medium">
            {name}
          </div>
        </div>
        <div className="flex gap-2">
          <BuildDiffFitToggle />
          <BuildDiffChangesOverlayToggle />
        </div>
      </div>
    );
  }
);
