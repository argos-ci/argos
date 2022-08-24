import React from "react";
import { getVariantColor } from "../modules/utils";
import { Icon } from "@argos-ci/app/src/components";
import { CheckIcon, XIcon, DotIcon } from "@primer/octicons-react";

export function StatusIcon({ status, ...props }) {
  const buildColor = getVariantColor(status);
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return <Icon as={XIcon} color={buildColor} {...props} />;
    case "success":
    case "complete":
      return <Icon as={CheckIcon} color={buildColor} {...props} />;
    case "pending":
      return <Icon as={DotIcon} color={buildColor} {...props} />;
    case "neutral":
      return <Icon as={DotIcon} color={buildColor} {...props} />;
    default:
      return null;
  }
}

export function statusText(status) {
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return "Changes Requested";
    case "success":
    case "complete":
      return "Review Approved";
    case "pending":
      return "Build In Progress";
    case "unknown":
      return "Differences detected";
    default:
      return null;
  }
}
