import { BugIcon } from "lucide-react";

import { Button, ButtonIcon } from "@/ui/Button";
import { Tooltip } from "@/ui/Tooltip";

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
    <Tooltip
      content={
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
          <BugIcon />
        </ButtonIcon>
        {onlyFlakySelected ? "Cancel Flaky Flag" : "Mark as Flaky"}
      </Button>
    </Tooltip>
  );
};
