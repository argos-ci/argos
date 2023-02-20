import { BugAntIcon } from "@heroicons/react/20/solid";

import { Chip } from "./Chip";
import { MagicTooltip } from "./Tooltip";

const FlakyIcon = BugAntIcon;
const flakySuspectedTooltip =
  "This screenshot comparison has high instability in recent builds and may be a flaky.";

export const FlakySuspectedIcon = () => {
  return (
    <MagicTooltip tooltip={flakySuspectedTooltip}>
      <FlakyIcon className="text-warning-400" />
    </MagicTooltip>
  );
};

export const FlakySuspectedChip = () => {
  return (
    <MagicTooltip tooltip={flakySuspectedTooltip}>
      <Chip icon={FlakyIcon} color="warning" scale="sm">
        Flaky suspected
      </Chip>
    </MagicTooltip>
  );
};
