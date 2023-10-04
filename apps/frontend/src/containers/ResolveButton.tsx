import { CheckCircle2Icon } from "lucide-react";

import { Button, ButtonIcon } from "@/ui/Button";
import { Tooltip } from "@/ui/Tooltip";

export const ResolveButton = ({
  onClick,
  disabled = true,
}: {
  onClick: () => void;
  disabled: boolean;
}) => {
  return (
    <Tooltip
      content={
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
          <CheckCircle2Icon />
        </ButtonIcon>
        Resolve
      </Button>
    </Tooltip>
  );
};
