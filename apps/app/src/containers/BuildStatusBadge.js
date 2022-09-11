import * as React from "react";
import { gql } from "graphql-tag";
import { getStatusColor, StatusIcon } from "./Status";
import { Tag } from "@argos-ci/app/src/components";

export const BuildStatusBadgeFragment = gql`
  fragment BuildStatusBadgeFragment on Build {
    status
    type
  }
`;

function getColor({ type, status }) {
  switch (type) {
    case "orphan":
      return "blue";

    case "reference":
      return "emerald";

    default:
      return getStatusColor(status);
  }
}

export function BuildStatusBadge({ build, children, ...props }) {
  const baseColor = getColor(build);
  const bgColor = `${baseColor}-500-a30`;
  const bgHoverColor =
    props.to || props.href ? `${baseColor}-500-a50` : bgColor;

  return (
    <Tag
      borderColor={`${baseColor}-500-a40`}
      backgroundColor={{ _: bgColor, hover: bgHoverColor }}
      whiteSpace="nowrap"
      cursor="default"
      {...props}
    >
      <StatusIcon
        status={
          build.type && build.type !== "check" ? build.type : build.status
        }
        mr={2}
      />
      {children}
    </Tag>
  );
}
