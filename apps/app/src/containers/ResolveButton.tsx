import { CheckCircleIcon } from "@heroicons/react/20/solid";

import { ListHeaderButton } from "@/ui/List";
import { MagicTooltip } from "@/ui/Tooltip";

export const ResolveButton = () => {
  return (
    <MagicTooltip tooltip="Resolve a flaky test">
      <ListHeaderButton icon={CheckCircleIcon}>Resolve</ListHeaderButton>
    </MagicTooltip>
  );
};
