import * as React from "react";
import { Icon } from "@argos-ci/app/src/components";
import { CheckIcon, XIcon, DotIcon } from "@primer/octicons-react";

export function getStatusColor(status) {
  switch (status) {
    case "primary":
      return "primary";

    case "success":
      return "green";

    case "danger":
    case "failure":
    case "error":
      return "red";

    case "neutral":
      return "gray";

    case "pending":
    default:
      return "orange";
  }
}

export function StatusIcon({ status, ...props }) {
  const buildColor = getStatusColor(status);
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
