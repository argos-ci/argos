import { memo } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

export const NextButton = memo(
  (props: { onPress: () => void; isDisabled: boolean }) => {
    const { onPress, isDisabled } = props;
    const hotkey = useBuildHotkey("goToNextDiff", onPress, {
      preventDefault: true,
      enabled: !isDisabled,
      allowInInput: true,
    });
    return (
      <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
        <IconButton isDisabled={isDisabled} onPress={onPress}>
          <ArrowDownIcon />
        </IconButton>
      </HotkeyTooltip>
    );
  },
);

export const PreviousButton = memo(
  (props: { onPress: () => void; isDisabled: boolean }) => {
    const { onPress, isDisabled } = props;
    const hotkey = useBuildHotkey("goToPreviousDiff", onPress, {
      preventDefault: true,
      enabled: !isDisabled,
      allowInInput: true,
    });
    return (
      <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
        <IconButton isDisabled={isDisabled} onPress={onPress}>
          <ArrowUpIcon />
        </IconButton>
      </HotkeyTooltip>
    );
  },
);
