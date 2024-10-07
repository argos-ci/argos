import { assertNever } from "@argos/util/assertNever";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleSlashIcon,
  DotIcon,
  RefreshCcwDotIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
} from "lucide-react";

type BuildType = "reference" | "check" | "orphan";

type BuildStatus =
  | "accepted"
  | "rejected"
  | "stable"
  | "diffDetected"
  | "pending"
  | "progress"
  | "error"
  | "aborted"
  | "expired";

export const getBuildColor = (
  type: BuildType | null | undefined,
  status: BuildStatus,
) => {
  switch (type) {
    case "reference":
      return "success" as const;
    case "orphan": {
      switch (status) {
        case "accepted":
          return "success" as const;

        case "rejected":
          return "danger" as const;

        default:
          return "info" as const;
      }
    }
    case "check": {
      switch (status) {
        case "accepted":
        case "stable":
          return "success" as const;

        case "error":
        case "rejected":
        case "expired":
          return "danger" as const;

        case "aborted":
          return "neutral" as const;

        case "progress":
        case "pending":
          return "pending" as const;

        case "diffDetected":
          return "warning" as const;

        default:
          assertNever(status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      switch (status) {
        case "expired":
        case "error":
          return "danger" as const;

        default:
          return "pending" as const;
      }
    default:
      assertNever(type);
  }
};

export const getBuildIcon = (
  type: BuildType | null | undefined,
  status: BuildStatus,
): React.ComponentType<any> => {
  switch (type) {
    case "reference":
      return BadgeCheckIcon;
    case "orphan": {
      switch (status) {
        case "accepted":
          return ThumbsUpIcon;

        case "rejected":
          return ThumbsDownIcon;

        default:
          return CircleSlashIcon;
      }
    }
    case "check": {
      switch (status) {
        case "accepted":
          return ThumbsUpIcon;

        case "stable":
          return CheckCircle2Icon;

        case "error":
        case "expired":
        case "aborted":
          return XCircleIcon;

        case "rejected":
          return ThumbsDownIcon;

        case "progress":
          return RefreshCcwDotIcon;

        case "pending":
          return CircleDotIcon;

        case "diffDetected":
          return AlertTriangleIcon;

        default:
          assertNever(status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      switch (status) {
        case "expired":
        case "error":
          return XCircleIcon;
        default:
          return DotIcon;
      }
    default:
      assertNever(type);
  }
};

export const getBuildLabel = (
  type: BuildType | null | undefined,
  status: BuildStatus,
): string => {
  switch (type) {
    case "orphan": {
      switch (status) {
        case "rejected":
          return "Changes rejected";
        case "accepted":
          return "Changes approved";
        default:
          return "Orphan build";
      }
    }
    case "reference":
      return "Auto-approved build";
    case "check": {
      switch (status) {
        case "stable":
          return "No changes detected";
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
          assertNever(status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      switch (status) {
        case "expired":
          return "Build expired";
        case "error":
          return "An error happened";
        default:
          return "Build scheduled";
      }
    default:
      assertNever(type);
  }
};
