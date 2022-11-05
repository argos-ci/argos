import { getBuildColor, getBuildIcon, getBuildLabel } from "./Build";
import { MagicTooltip } from "@/modern/ui/Tooltip";
import type { Build } from "./Build";
import { BuildStatusDescription } from "./BuildStatusDescription";
import type { BuildStatusDescriptionProps } from "./BuildStatusDescription";

import { Chip } from "@/modern/ui/Chip";

export interface BuildStatusChipProps {
  build: BuildStatusDescriptionProps["build"] & Pick<Build, "type" | "status">;
  repository: BuildStatusDescriptionProps["repository"];
}

export const BuildStatusChip = ({
  build,
  repository,
}: BuildStatusChipProps) => {
  return (
    <MagicTooltip
      variant="info"
      tooltip={<BuildStatusDescription build={build} repository={repository} />}
    >
      <Chip
        icon={getBuildIcon(build.type, build.status)}
        color={getBuildColor(build.type, build.status)}
      >
        {getBuildLabel(build.type, build.status)}
      </Chip>
    </MagicTooltip>
  );
};
