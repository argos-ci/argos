import { assertNever } from "@argos/util/assertNever";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleSlashIcon,
  ClockIcon,
  HourglassIcon,
  PauseIcon,
  RefreshCcwDotIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";

import { BuildStatus, TestReportStatus } from "@/gql/graphql";

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

/**
 * Get the descriptor for a test report status.
 */
export function getTestReportStatusDescriptor(status: TestReportStatus) {
  switch (status) {
    case TestReportStatus.Passed:
      return {
        label: "Passed",
        color: "success" as const,
        icon: CheckIcon,
        description:
          "All tests passed successfully. This build is eligible to be used as a baseline.",
      };
    case TestReportStatus.Failed:
      return {
        label: "Failed",
        color: "danger" as const,
        icon: XIcon,
        description:
          "Some tests failed. This build is not eligible to be used as a baseline.",
      };
    case TestReportStatus.Timedout:
      return {
        label: "Timed Out",
        color: "danger" as const,
        icon: ClockIcon,
        description:
          "Some tests timed out. This build is not eligible to be used as a baseline.",
      };
    case TestReportStatus.Interrupted:
      return {
        label: "Interrupted",
        color: "danger" as const,
        icon: PauseIcon,
        description:
          "Some tests were interrupted. This build is not eligible to be used as a baseline.",
      };
    default:
      assertNever(status);
  }
}
