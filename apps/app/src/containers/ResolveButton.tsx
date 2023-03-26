import { CheckCircleIcon } from "@heroicons/react/20/solid";

import { ListHeaderButton } from "@/ui/List";
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
      <div>
        <ListHeaderButton
          icon={CheckCircleIcon}
          onClick={onClick}
          disabled={disabled}
        >
          Resolve
        </ListHeaderButton>
      </div>
    </MagicTooltip>
  );
};
