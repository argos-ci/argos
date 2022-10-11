import * as React from "react";
import { gql } from "graphql-tag";
import { getBuildStatusLabel, getStatusColor, StatusIcon } from "./Status";
import { Tag } from "@argos-ci/app/src/components";

export const BuildStatusBadgeFragment = gql`
  fragment BuildStatusBadgeFragment on Build {
    status
    type
  }
`;

export function BuildStatusBadge({ build, children, ...props }) {
  const compositeStatus =
    build.type && build.type !== "check" ? build.type : build.status;
  const baseColor = getStatusColor(compositeStatus);
  const bgColor = `${baseColor}-500-a30`;
  const hoverBgColor =
    props.to || props.href ? `${baseColor}-500-a50` : bgColor;

  const statusLabel = getBuildStatusLabel(build);

  return (
    <Tag
      borderColor={`${baseColor}-500-a40`}
      backgroundColor={{ _: bgColor, hover: hoverBgColor }}
      whiteSpace="nowrap"
      {...props}
    >
      <StatusIcon status={compositeStatus} mr={2} />
      {statusLabel}
    </Tag>
  );
}
