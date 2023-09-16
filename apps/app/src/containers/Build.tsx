import {
  AlertTriangleIcon,
  DotIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  RefreshCcwDotIcon,
  CircleSlashIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  BadgeCheckIcon,
  XCircleIcon,
} from "lucide-react";

export type BuildType = "reference" | "check" | "orphan";

export type BuildStatus =
  | "accepted"
  | "rejected"
  | "stable"
  | "diffDetected"
  | "pending"
  | "progress"
  | "error"
  | "aborted"
  | "expired";

export interface BuildStats {
  total: number;
  failure: number;
  changed: number;
  added: number;
  removed: number;
  unchanged: number;
}

export const getBuildColor = (
  type: BuildType | null | undefined,
  status: BuildStatus,
) => {
  switch (type) {
    case "reference":
      return "success" as const;
    case "orphan":
      return "info" as const;
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
          throw new Error(`Invalid status: ${status}`);
      }
    }
    case null:
      switch (status) {
        case "expired":
        case "error":
          return "danger" as const;

        default:
          return "pending" as const;
      }
    default:
      throw new Error(`Invalid type: ${type}`);
  }
};

export const getBuildIcon = (
  type: BuildType | null | undefined,
  status: BuildStatus,
): React.ComponentType<any> => {
  switch (type) {
    case "reference":
      return BadgeCheckIcon;
    case "orphan":
      return CircleSlashIcon;
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
          throw new Error(`Invalid status: ${status}`);
      }
    }
    case null:
      switch (status) {
        case "expired":
        case "error":
          return XCircleIcon;
        default:
          return DotIcon;
      }
    default:
      throw new Error(`Invalid type: ${type}`);
  }
};

export const getBuildLabel = (
  type: BuildType | null | undefined,
  status: BuildStatus,
): string => {
  switch (type) {
    case "orphan":
      return "Orphan build";
    case "reference":
      return "Reference build";
    case "check": {
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
        case "expired":
          return "Build expired";
        case "rejected":
          return "Changes rejected";
        case "accepted":
          return "Changes approved";
        default:
          throw new Error(`Invalid status: ${status}`);
      }
    }
    case null:
      switch (status) {
        case "expired":
          return "Build expired";
        case "error":
          return "An error happened";
        default:
          return "Build scheduled";
      }
    default:
      throw new Error(`Invalid type: ${type}`);
  }
};

export const checkIsBuildIncomplete = (build: {
  batchCount?: number | null;
  totalBatch?: number | null;
}): boolean => {
  return (
    build.totalBatch != null &&
    build.batchCount != null &&
    build.totalBatch > 0 &&
    build.batchCount < build.totalBatch
  );
};

export const checkIsBuildEmpty = (build: {
  stats: { total: number };
}): boolean => {
  return build.stats.total === 0;
};
