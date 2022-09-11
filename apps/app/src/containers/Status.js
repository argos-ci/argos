import * as React from "react";
import { Icon } from "@argos-ci/app/src/components";
import {
  DotIcon,
  IssueOpenedIcon,
  IssueReopenedIcon,
  XCircleIcon,
  IssueClosedIcon,
  ThumbsupIcon,
  ThumbsdownIcon,
  AlertIcon,
  VerifiedIcon,
  SkipIcon,
} from "@primer/octicons-react";

export function getStatusColor(status) {
  switch (status) {
    case "primary":
      return "primary";

    case "success":
    case "accepted":
    case "stable":
    case "added":
      return "green";

    case "danger":
    case "failed":
    case "error":
    case "rejected":
      return "red";

    case "neutral":
    case "aborted":
      return "gray";

    case "warning":
    case "pending":
    case "progress":
    case "diffDetected":
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
    case "pending":
      return <Icon as={IssueOpenedIcon} color={buildColor} {...props} />;
    case "progress":
      return <Icon as={IssueReopenedIcon} color={buildColor} {...props} />;
    case "error":
    case "aborted":
      return <Icon as={XCircleIcon} color={buildColor} {...props} />;
    case "stable":
      return <Icon as={IssueClosedIcon} color={buildColor} {...props} />;
    case "diffDetected":
      return <Icon as={AlertIcon} color={buildColor} {...props} />;
    case "success":
    case "accepted":
      return <Icon as={ThumbsupIcon} color={buildColor} {...props} />;
    case "rejected":
      return <Icon as={ThumbsdownIcon} color={buildColor} {...props} />;
    case "orphan":
      return <Icon as={SkipIcon} color={buildColor} {...props} />;
    case "reference":
      return <Icon as={VerifiedIcon} color={buildColor} {...props} />;
    case "neutral":
      return <Icon as={DotIcon} color={buildColor} {...props} />;
    default:
      return null;
  }
}

export function getBuildStatusLabel(status) {
  switch (status) {
    case "stable":
      return "No change detected";
    case "diffDetected":
      return "Changes detected";
    case "pending":
      return "Build scheduled";
    case "progress":
      return "Build in progress";
    case "error":
      return "An error happened";
    case "aborted":
      return "Build aborted";
    case "rejected":
      return "Changes rejected";
    case "accepted":
      return "Changes approved";
    default:
      return null;
  }
}
