import * as React from "react";
import { Icon } from "@argos-ci/app/src/components";
import { CheckIcon, XIcon, DotIcon } from "@primer/octicons-react";

export function getStatusColor(status) {
  switch (status) {
    case "primary":
      return "primary";

    case "success":
    case "added":
    case "stable":
      return "green";

    case "danger":
    case "failure":
    case "error":
      return "red";

    case "neutral":
      return "gray";

    case "pending":
    case "warning":
    case "updated":
    default:
      return "orange";
  }
}

export function getStatusPrimaryColor(status) {
  return `${getStatusColor(status)}-500`;
}

export function StatusIcon({ status, ...props }) {
  const buildColor = `${getStatusPrimaryColor(status)}`;
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

export function getStatusText(status) {
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return "Changes requested";
    case "success":
    case "complete":
      return "Review approved";
    case "pending":
      return "Build in progress";
    case "unknown":
      return "Differences detected";
    default:
      return null;
  }
}
