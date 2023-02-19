import { BugAntIcon } from "@heroicons/react/20/solid";

import { Chip } from "./Chip";
import { MagicTooltip } from "./Tooltip";

const Icon = BugAntIcon;
const color = "warning";

export const FlakyIndicatorIcon = () => {
  return (
    <MagicTooltip tooltip="Move to end for flaky suspicion">
      <Icon
        className={`absolute top-3 right-4 z-30 h-4 w-4 text-${color}-400`}
      />
    </MagicTooltip>
  );
};

export const FlakyIndicatorChip = () => {
  return (
    <MagicTooltip tooltip="This screenshot comparison has high instability in recent builds and may be a flaky.">
      <Chip icon={Icon} color={color} scale="sm">
        Flaky suspected
      </Chip>
    </MagicTooltip>
  );
};
