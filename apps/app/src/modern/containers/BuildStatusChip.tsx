import { getBuildColor, getBuildIcon, getBuildLabel } from "./Build";
import { MagicTooltip } from "@/modern/ui/Tooltip";
import { BuildStatusDescription } from "./BuildStatusDescription";

import { Chip } from "@/modern/ui/Chip";
import { useFragment, graphql, FragmentType } from "@/gql";

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
      >
        {getBuildLabel(build.type, build.status)}
      </Chip>
    </MagicTooltip>
  );
};
