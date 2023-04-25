import { FragmentType, graphql, useFragment } from "@/gql";
import { Chip, ChipProps } from "@/ui/Chip";
import { MagicTooltip } from "@/ui/Tooltip";

import { getBuildColor, getBuildIcon, getBuildLabel } from "./Build";
import { BuildStatusDescription } from "./BuildStatusDescription";

export const BuildFragment = graphql(`
  fragment BuildStatusChip_Build on Build {
    ...BuildStatusDescription_Build
    type
    status
  }
`);

export const ProjectFragment = graphql(`
  fragment BuildStatusChip_Project on Project {
    ...BuildStatusDescription_Project
  }
`);

export const BuildStatusChip = (props: {
  build: FragmentType<typeof BuildFragment>;
  project: FragmentType<typeof ProjectFragment>;
  scale?: ChipProps["scale"];
}) => {
  const build = useFragment(BuildFragment, props.build);
  const project = useFragment(ProjectFragment, props.project);
  return (
    <MagicTooltip
      variant="info"
      tooltip={<BuildStatusDescription build={build} project={project} />}
    >
      <Chip
        icon={getBuildIcon(build.type, build.status)}
        color={getBuildColor(build.type, build.status)}
        scale={props.scale}
      >
        {getBuildLabel(build.type, build.status)}
      </Chip>
    </MagicTooltip>
  );
};
