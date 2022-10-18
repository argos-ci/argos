import {
  AlertIcon,
  DotIcon,
  IssueClosedIcon,
  IssueOpenedIcon,
  IssueReopenedIcon,
  SkipIcon,
  ThumbsdownIcon,
  ThumbsupIcon,
  VerifiedIcon,
  XCircleIcon,
} from "@primer/octicons-react";

export function getBuildStatusColor(compositeStatus) {
  switch (compositeStatus) {
    case "orphan":
      return "info";

    case "accepted":
    case "stable":
    case "reference":
      return "success";

    case "error":
    case "rejected":
    case "expired":
      return "danger";

    case "aborted":
      return "neutral";

    case "progress":
    case "pending":
      return "pending";

    case "diffDetected":
    default:
      return "warning";
  }
}

export function getBuildStatusIcon(compositeStatus) {
  switch (compositeStatus) {
    case "orphan":
      return SkipIcon;

    case "accepted":
      return ThumbsupIcon;

    case "stable":
      return IssueClosedIcon;

    case "reference":
      return VerifiedIcon;

    case "error":
    case "expired":
    case "aborted":
      return XCircleIcon;

    case "rejected":
      return ThumbsdownIcon;

    case "progress":
      return IssueReopenedIcon;

    case "pending":
      return IssueOpenedIcon;

    case "diffDetected":
      return AlertIcon;

    case "success":
    case "neutral":
      return DotIcon;

    default:
      return null;
  }
}

export function getBuildStatusLabel(compositeStatus) {
  switch (compositeStatus) {
    case "orphan":
      return "Orphan build";
    case "reference":
      return "Reference build";
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
    case "expired":
      return "Build expired";
    case "rejected":
      return "Changes rejected";
    case "accepted":
      return "Changes approved";
    default:
      return null;
  }
}
