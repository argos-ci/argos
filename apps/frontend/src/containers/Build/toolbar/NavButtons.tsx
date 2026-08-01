import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

export function NextButton(props: {
  onPress: () => void;
  isDisabled: boolean;
}) {
  const { onPress, isDisabled } = props;
  const hotkey = useBuildHotkey("goToNextDiff", onPress, {
    preventDefault: true,
    enabled: !isDisabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <Button
        variant="secondary"
        iconOnly
        isDisabled={isDisabled}
        onPress={onPress}
      >
        <ArrowDownIcon />
      </Button>
    </HotkeyTooltip>
  );
}

export function PreviousButton(props: {
  onPress: () => void;
  isDisabled?: boolean;
  /**
   * On the first snapshot, the button returns to the build overview. Only the
   * tooltip says so: the sidebar already has a home button for the overview, and
   * a second one here read as a different destination.
   */
  toOverview?: boolean;
}) {
  const { onPress, isDisabled = false, toOverview = false } = props;
  const hotkey = useBuildHotkey("goToPreviousDiff", onPress, {
    preventDefault: true,
    enabled: !isDisabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip
      description={toOverview ? "Go to overview" : hotkey.description}
      keys={hotkey.displayKeys}
    >
      <Button
        variant="secondary"
        iconOnly
        isDisabled={isDisabled}
        onPress={onPress}
      >
        <ArrowUpIcon />
      </Button>
    </HotkeyTooltip>
  );
}
