import { FragmentType, graphql, useFragment } from "@/gql";
import { Chip, ChipProps } from "@/modern/ui/Chip";
import { MagicTooltip } from "@/modern/ui/Tooltip";

import { getBuildColor, getBuildIcon, getBuildLabel } from "./Build";
import { BuildStatusDescription } from "./BuildStatusDescription";

export const BuildFragment = graphql(`
  fragment BuildStatusChip_Build on Build {
    ...BuildStatusDescription_Build
    type
    status
  }
`);

export const RepositoryFragment = graphql(`
  fragment BuildStatusChip_Repository on Repository {
    ...BuildStatusDescription_Repository
  }
`);

export const BuildStatusChip = (props: {
  build: FragmentType<typeof BuildFragment>;
  repository: FragmentType<typeof RepositoryFragment>;
  scale?: ChipProps["scale"];
}) => {
  const build = useFragment(BuildFragment, props.build);
  const repository = useFragment(RepositoryFragment, props.repository);
  return (
    <MagicTooltip
      variant="info"
      tooltip={<BuildStatusDescription build={build} repository={repository} />}
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
