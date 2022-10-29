import { gql } from "graphql-tag";

import {
  Chip,
  ParagraphTooltip,
  TooltipAnchor,
  useTooltipState,
} from "@argos-ci/app/src/components";

import {
  BuildStatusInfo,
  BuildStatusInfoBuildFragment,
  BuildStatusInfoRepositoryFragment,
  getStatusInfoType,
} from "../pages/Build/BuildStatusInfo";
import {
  getBuildStatusColor,
  getBuildStatusIcon,
  getBuildStatusLabel,
} from "./BuildStatus";

export const BuildStatusChipBuildFragment = gql`
  fragment BuildStatusChipBuildFragment on Build {
    type
    status
    ...BuildStatusInfoBuildFragment

    stats {
      screenshotCount
    }
  }

  ${BuildStatusInfoBuildFragment}
`;

export const BuildStatusChipRepositoryFragment = gql`
  fragment BuildStatusChipRepositoryFragment on Repository {
    ...BuildStatusInfoRepositoryFragment
  }

  ${BuildStatusInfoRepositoryFragment}
`;

const StatusChip = ({ build, ...props }) => {
  const compositeStatus =
    build.type && build.type !== "check" ? build.type : build.status;

  return (
    <Chip
      icon={getBuildStatusIcon(compositeStatus)}
      color={getBuildStatusColor(compositeStatus)}
      {...props}
    >
      {getBuildStatusLabel(compositeStatus)}
    </Chip>
  );
};

const StatusChipWithTooltip = ({
  build,
  statusInfoType,
  referenceBranch,
  ...props
}) => {
  const tooltip = useTooltipState();

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <StatusChip build={build} {...props} />
      </TooltipAnchor>
      <ParagraphTooltip state={tooltip} zIndex={200}>
        <BuildStatusInfo
          statusInfoType={statusInfoType}
          referenceBranch={referenceBranch}
        />
      </ParagraphTooltip>
    </>
  );
};

export function BuildStatusChip({ build, ...props }) {
  const statusInfoType = getStatusInfoType(build);

  if (!statusInfoType) {
    return <StatusChip build={build} {...props} />;
  }

  return (
    <StatusChipWithTooltip
      build={build}
      statusInfoType={statusInfoType}
      {...props}
    />
  );
}
