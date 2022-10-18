import * as React from "react";
import { gql } from "graphql-tag";
import {
  getBuildStatusColor,
  getBuildStatusIcon,
  getBuildStatusLabel,
} from "./BuildStatus";
import { Chip } from "@argos-ci/app/src/components";

export const BuildStatusChipFragment = gql`
  fragment BuildStatusChipFragment on Build {
    compositeStatus
  }
`;

export function BuildStatusChip({ build, ...props }) {
  if (!build?.compositeStatus) return null;

  return (
    <Chip
      icon={getBuildStatusIcon(build.compositeStatus)}
      color={getBuildStatusColor(build.compositeStatus)}
      {...props}
    >
      {getBuildStatusLabel(build.compositeStatus)}
    </Chip>
  );
}
