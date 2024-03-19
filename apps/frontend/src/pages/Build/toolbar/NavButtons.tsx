import { memo } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { useBuildDiffState } from "../BuildDiffState";
import { useBuildHotkey } from "../BuildHotkeys";

export const NextButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex >= diffs.length - 1;
  const goToNextDiff = () => {
    if (disabled) return;

    const isGroupExpanded =
      !activeDiff?.group || expanded.includes(activeDiff.group);
    if (isGroupExpanded) {
      const nextDiff = diffs[activeDiffIndex + 1];
      if (nextDiff) setActiveDiff(nextDiff, true);
      return;
    }

    const offsetIndex = activeDiffIndex + 1;
    const nextDiffIndex = diffs
      .slice(offsetIndex)
      .findIndex((diff) => diff.group !== activeDiff.group);
    if (nextDiffIndex !== -1) {
      const nextDiff = diffs[nextDiffIndex + offsetIndex];
      if (nextDiff) setActiveDiff(nextDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToNextDiff", goToNextDiff, {
    preventDefault: true,
    enabled: !disabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToNextDiff}>
        <ArrowDownIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

export const PreviousButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex <= 0;
  const goToPreviousDiff = () => {
    if (disabled) return;

    const previousDiffIndex = activeDiffIndex - 1;
    const previousDiff = diffs[previousDiffIndex];
    if (!previousDiff) return;

    const isGroupExpanded =
      !previousDiff.group || expanded.includes(previousDiff.group);
    if (isGroupExpanded) {
      setActiveDiff(previousDiff, true);
      return;
    }

    const newDiffIndex = diffs
      .slice(0, previousDiffIndex)
      .findIndex((diff) => diff.group === previousDiff.group);
    if (newDiffIndex !== -1) {
      const newDiff = diffs[newDiffIndex];
      if (newDiff) setActiveDiff(newDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToPreviousDiff", goToPreviousDiff, {
    preventDefault: true,
    enabled: !disabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToPreviousDiff}>
        <ArrowUpIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
