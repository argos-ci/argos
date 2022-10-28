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
    type
    status
  }
`;

export function BuildStatusChip({ build, ...props }) {
  const compositeStatus =
    build.type && build.type !== "check" ? build.type : build.status;

  if (!compositeStatus) {
    return null;
  }

  return (
    <Chip
      icon={getBuildStatusIcon(compositeStatus)}
      color={getBuildStatusColor(compositeStatus)}
      {...props}
    >
      {getBuildStatusLabel(compositeStatus)}
    </Chip>
  );
}
