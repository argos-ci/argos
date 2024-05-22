import { memo } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import {
  useGoToNextDiff,
  useGoToPreviousDiff,
  useHasNextDiff,
  useHasPreviousDiff,
} from "../BuildDiffState";
import { useBuildHotkey } from "../BuildHotkeys";

export const NextButton = memo(() => {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const hotkey = useBuildHotkey("goToNextDiff", goToNextDiff, {
    preventDefault: true,
    enabled: hasNextDiff,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton isDisabled={!hasNextDiff} onPress={goToNextDiff}>
        <ArrowDownIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

export const PreviousButton = memo(() => {
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  const hotkey = useBuildHotkey("goToPreviousDiff", goToPreviousDiff, {
    preventDefault: true,
    enabled: hasPreviousDiff,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton isDisabled={!hasPreviousDiff} onPress={goToPreviousDiff}>
        <ArrowUpIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});
