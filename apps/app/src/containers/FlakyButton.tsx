import { BugAntIcon } from "@heroicons/react/20/solid";

import { ListHeaderButton } from "@/ui/List";
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
      <div>
        <ListHeaderButton
          icon={BugAntIcon}
          onClick={onClick}
          disabled={disabled}
        >
          {onlyFlakySelected ? "Cancel Flaky Flag" : "Mark as Flaky"}
        </ListHeaderButton>
      </div>
    </MagicTooltip>
  );
};
