import { assertNever } from "@argos/util/assertNever";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CheckCircle2Icon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleSlashIcon,
  HourglassIcon,
  RefreshCcwDotIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
} from "lucide-react";

import { BuildStatus } from "@/gql/graphql";

type BuildType = "reference" | "check" | "orphan";

export const buildStatusDescriptors: Record<
  BuildStatus,
  {
    label: string;
    color: "success" | "warning" | "danger" | "info" | "pending" | "neutral";
    icon: React.ComponentType<any>;
  }
> = {
  [BuildStatus.NoChanges]: {
    label: "No changes",
    color: "success" as const,
    icon: CheckCircle2Icon,
  },
  [BuildStatus.ChangesDetected]: {
    label: "Changes detected",
    color: "warning" as const,
    icon: AlertTriangleIcon,
  },
  [BuildStatus.Pending]: {
    label: "Scheduled",
    color: "neutral" as const,
    icon: CircleDotIcon,
  },
  [BuildStatus.Progress]: {
    label: "In progress",
    color: "pending" as const,
    icon: RefreshCcwDotIcon,
  },
  [BuildStatus.Error]: {
    label: "Failed",
    color: "danger" as const,
    icon: XCircleIcon,
  },
  [BuildStatus.Aborted]: {
    label: "Aborted",
    color: "neutral" as const,
    icon: XCircleIcon,
  },
  [BuildStatus.Expired]: {
    label: "Expired",
    color: "danger" as const,
    icon: HourglassIcon,
  },
  [BuildStatus.Rejected]: {
    label: "Rejected",
    color: "danger" as const,
    icon: ThumbsDownIcon,
  },
  [BuildStatus.Accepted]: {
    label: "Approved",
    color: "success" as const,
    icon: ThumbsUpIcon,
  },
};

export const buildTypeDescriptors: Record<
  BuildType,
  {
    label: string;
    color: "success" | "warning" | "danger" | "info" | "pending" | "neutral";
    icon: React.ComponentType<any>;
  }
> = {
  reference: {
    label: "Auto-approved",
    color: "success" as const,
    icon: BadgeCheckIcon,
  },
  check: {
    label: "Check",
    color: "neutral" as const,
    icon: CircleCheckIcon,
  },
  orphan: {
    label: "Orphan",
    color: "info" as const,
    icon: CircleSlashIcon,
  },
};

export function getBuildDescriptor(
  type: BuildType | null | undefined,
  status: BuildStatus,
) {
  switch (type) {
    case "reference":
      return buildTypeDescriptors.reference;
    case "orphan": {
      if (status === BuildStatus.Accepted || status === BuildStatus.Rejected) {
        return buildStatusDescriptors[status];
      }
      return buildTypeDescriptors.orphan;
    }
    case "check": {
      return buildStatusDescriptors[status];
    }
    case null:
    case undefined: {
      if (status === BuildStatus.Expired || status === BuildStatus.Error) {
        return buildStatusDescriptors[status];
      }
      return buildStatusDescriptors.PENDING;
    }
    default:
      assertNever(type);
  }
}
