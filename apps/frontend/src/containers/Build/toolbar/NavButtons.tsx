import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import {
  type HotkeyName,
  useBuildHotkey,
} from "@/containers/Build/BuildHotkeys";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

export function NextButton(props: {
  onPress: () => void;
  isDisabled: boolean;
  /**
   * The shortcut this button owns. Same arrow key either way — what differs is
   * how the `?` dialog words it, which depends on what is being navigated.
   */
  hotkeyName?: HotkeyName;
}) {
  const { onPress, isDisabled, hotkeyName = "goToNextDiff" } = props;
  const hotkey = useBuildHotkey(hotkeyName, onPress, {
    preventDefault: true,
    enabled: !isDisabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <Button
        variant="ghost"
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
  /** See {@link NextButton}. */
  hotkeyName?: HotkeyName;
}) {
  const {
    onPress,
    isDisabled = false,
    toOverview = false,
    hotkeyName = "goToPreviousDiff",
  } = props;
  const hotkey = useBuildHotkey(hotkeyName, onPress, {
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
        variant="ghost"
        iconOnly
        isDisabled={isDisabled}
        onPress={onPress}
      >
        <ArrowUpIcon />
      </Button>
    </HotkeyTooltip>
  );
}
