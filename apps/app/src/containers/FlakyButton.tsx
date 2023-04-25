import { BugAntIcon } from "@heroicons/react/20/solid";

import { Button, ButtonIcon } from "@/ui/Button";
import { MagicTooltip } from "@/ui/Tooltip";

export const FlakyButton = ({
  onClick,
  disabled = true,
  onlyFlakySelected = false,
}: {
  onClick: () => void;
  disabled: boolean;
  onlyFlakySelected: boolean;
}) => {
  return (
    <MagicTooltip
      tooltip={
        disabled
          ? "Select a test to mark it as flaky"
          : onlyFlakySelected
          ? "Remove flaky flag if mistakenly added"
          : "Mark a test as flaky to highlight its inconsistency for future review"
      }
    >
      <Button
        size="small"
        variant="outline"
        color="neutral"
        onClick={onClick}
        disabled={disabled}
        accessibleWhenDisabled
      >
        <ButtonIcon>
          <BugAntIcon />
        </ButtonIcon>
        {onlyFlakySelected ? "Cancel Flaky Flag" : "Mark as Flaky"}
      </Button>
    </MagicTooltip>
  );
};
