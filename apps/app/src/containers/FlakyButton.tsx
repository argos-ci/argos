import { BugAntIcon } from "@heroicons/react/20/solid";

import { ListHeaderButton } from "@/ui/List";
import { MagicTooltip } from "@/ui/Tooltip";

export const FlakyButton = () => {
  return (
    <MagicTooltip tooltip="Flag a test with inconsistent results">
      <ListHeaderButton icon={BugAntIcon}>Mark as Flaky</ListHeaderButton>
    </MagicTooltip>
  );
};
