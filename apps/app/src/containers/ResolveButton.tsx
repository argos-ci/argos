import { CheckCircleIcon } from "@heroicons/react/20/solid";

import { Button, ButtonIcon } from "@/ui/Button";
import { MagicTooltip } from "@/ui/Tooltip";

export const ResolveButton = ({
  onClick,
  disabled = true,
}: {
  onClick: () => void;
  disabled: boolean;
}) => {
  return (
    <MagicTooltip
      tooltip={
        disabled
          ? "Select a test to mark it as resolved"
          : "Mark flaky test as resolved after addressing the issue"
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
          <CheckCircleIcon />
        </ButtonIcon>
        Resolve
      </Button>
    </MagicTooltip>
  );
};
