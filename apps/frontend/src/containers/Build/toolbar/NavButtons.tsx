import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { type HotkeyName } from "@/containers/Build/hotkeys";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

export function NextButton(props: {
  onClick: () => void;
  disabled: boolean;
  /**
   * The shortcut this button owns. Same arrow key either way — what differs is
   * how the `?` dialog words it, which depends on what is being navigated.
   */
  hotkeyName?: HotkeyName;
}) {
  const { onClick, disabled, hotkeyName = "goToNextDiff" } = props;
  const hotkey = useBuildHotkey(hotkeyName, onClick, {
    preventDefault: true,
    enabled: !disabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <Button variant="ghost" iconOnly disabled={disabled} onClick={onClick}>
        <ArrowDownIcon />
      </Button>
    </HotkeyTooltip>
  );
}

export function PreviousButton(props: {
  onClick: () => void;
  disabled?: boolean;
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
    onClick,
    disabled = false,
    toOverview = false,
    hotkeyName = "goToPreviousDiff",
  } = props;
  const hotkey = useBuildHotkey(hotkeyName, onClick, {
    preventDefault: true,
    enabled: !disabled,
    allowInInput: true,
  });
  return (
    <HotkeyTooltip
      description={toOverview ? "Go to overview" : hotkey.description}
      keys={hotkey.displayKeys}
    >
      <Button variant="ghost" iconOnly disabled={disabled} onClick={onClick}>
        <ArrowUpIcon />
      </Button>
    </HotkeyTooltip>
  );
}
