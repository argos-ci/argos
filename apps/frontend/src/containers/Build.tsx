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

import { BuildStatus } from "@/gql/graphql";

type BuildType = "reference" | "check" | "orphan";

export const getBuildColor = (
  type: BuildType | null | undefined,
  status: BuildStatus,
) => {
  switch (type) {
    case "reference":
      return "success" as const;
    case "orphan": {
      switch (status) {
        case BuildStatus.Accepted:
          return "success" as const;

        case BuildStatus.Rejected:
          return "danger" as const;

        default:
          return "info" as const;
      }
    }
    case "check": {
      switch (status) {
        case BuildStatus.Accepted:
        case BuildStatus.NoChanges:
          return "success" as const;

        case BuildStatus.Error:
        case BuildStatus.Rejected:
        case BuildStatus.Expired:
          return "danger" as const;

        case BuildStatus.Aborted:
          return "neutral" as const;

        case BuildStatus.Progress:
        case BuildStatus.Pending:
          return "pending" as const;

        case BuildStatus.ChangesDetected:
          return "warning" as const;

        default:
          assertNever(status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      switch (status) {
        case BuildStatus.Expired:
        case BuildStatus.Error:
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
        case BuildStatus.Accepted:
          return ThumbsUpIcon;

        case BuildStatus.Rejected:
          return ThumbsDownIcon;

        default:
          return CircleSlashIcon;
      }
    }
    case "check": {
      switch (status) {
        case BuildStatus.Accepted:
          return ThumbsUpIcon;

        case BuildStatus.NoChanges:
          return CheckCircle2Icon;

        case BuildStatus.Error:
        case BuildStatus.Expired:
        case BuildStatus.Aborted:
          return XCircleIcon;

        case BuildStatus.Rejected:
          return ThumbsDownIcon;

        case BuildStatus.Progress:
          return RefreshCcwDotIcon;

        case BuildStatus.Pending:
          return CircleDotIcon;

        case BuildStatus.ChangesDetected:
          return AlertTriangleIcon;

        default:
          assertNever(status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      switch (status) {
        case BuildStatus.Expired:
        case BuildStatus.Error:
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
        case BuildStatus.Rejected:
          return "Changes rejected";
        case BuildStatus.Accepted:
          return "Changes approved";
        default:
          return "Orphan build";
      }
    }
    case "reference":
      return "Auto-approved build";
    case "check": {
      switch (status) {
        case BuildStatus.NoChanges:
          return "No changes detected";
        case BuildStatus.ChangesDetected:
          return "Changes detected";
        case BuildStatus.Pending:
          return "Build scheduled";
        case BuildStatus.Progress:
          return "Build in progress";
        case BuildStatus.Error:
          return "Build failed";
        case BuildStatus.Aborted:
          return "Build aborted";
        case BuildStatus.Expired:
          return "Build expired";
        case BuildStatus.Rejected:
          return "Changes rejected";
        case BuildStatus.Accepted:
          return "Changes approved";
        default:
          assertNever(status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      switch (status) {
        case BuildStatus.Expired:
          return "Build expired";
        case BuildStatus.Error:
          return "Build failed";
        default:
          return "Build scheduled";
      }
    default:
      assertNever(type);
  }
};
