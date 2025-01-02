import { FragmentType, graphql, useFragment } from "@/gql";
import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { getBuildDescriptor } from "./Build";
import { BuildStatusDescription } from "./BuildStatusDescription";

const BuildFragment = graphql(`
  fragment BuildStatusChip_Build on Build {
    ...BuildStatusDescription_Build
    type
    status
  }
`);

export const BuildStatusChip = (props: {
  build: FragmentType<typeof BuildFragment>;
  scale?: ChipProps["scale"];
}) => {
  const build = useFragment(BuildFragment, props.build);
  const descriptor = getBuildDescriptor(build.type, build.status);
  return (
    <Tooltip variant="info" content={<BuildStatusDescription build={build} />}>
      <Chip icon={descriptor.icon} color={descriptor.color} scale={props.scale}>
        {descriptor.label}
      </Chip>
    </Tooltip>
  );
};
