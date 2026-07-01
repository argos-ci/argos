import { assertNever } from "@argos/util/assertNever";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  BookmarkCheckIcon,
  BookmarkXIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleSlashIcon,
  ClockIcon,
  HourglassIcon,
  PauseIcon,
  RefreshCcwDotIcon,
  SquareSlashIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";

import {
  BuildBaselineIneligibilityReason,
  BuildStatus,
  BuildType,
  TestReportStatus,
} from "@/gql/graphql";

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
  [BuildType.Reference]: {
    label: "Auto-approved",
    color: "success" as const,
    icon: BadgeCheckIcon,
  },
  [BuildType.Check]: {
    label: "Check",
    color: "neutral" as const,
    icon: CircleCheckIcon,
  },
  [BuildType.Orphan]: {
    label: "Orphan",
    color: "info" as const,
    icon: CircleSlashIcon,
  },
  [BuildType.Skipped]: {
    label: "Skipped",
    color: "neutral" as const,
    icon: SquareSlashIcon,
  },
};

export function getBuildDescriptor(
  type: BuildType | null | undefined,
  status: BuildStatus,
) {
  if (status === BuildStatus.Expired || status === BuildStatus.Error) {
    return buildStatusDescriptors[status];
  }

  switch (type) {
    case BuildType.Skipped:
    case BuildType.Reference:
      return buildTypeDescriptors[type];

    case BuildType.Orphan: {
      if (status === BuildStatus.Accepted || status === BuildStatus.Rejected) {
        return buildStatusDescriptors[status];
      }
      return buildTypeDescriptors[type];
    }

    case BuildType.Check: {
      return buildStatusDescriptors[status];
    }

    case null:
    case undefined: {
      return buildStatusDescriptors.PENDING;
    }

    default:
      assertNever(type);
  }
}

/**
 * Get the descriptor for the baseline eligibility of a build.
 */
export function getBaselineEligibilityDescriptor(eligible: boolean) {
  return eligible
    ? {
        label: "Eligible as baseline",
        color: "success" as const,
        icon: BookmarkCheckIcon,
        description:
          "This build is eligible to be used as a baseline by future builds.",
      }
    : {
        label: "Not eligible as baseline",
        color: "neutral" as const,
        icon: BookmarkXIcon,
        description:
          "This build is not eligible to be used as a baseline by future builds.",
      };
}

/**
 * Get a human readable explanation of why a build is not eligible as a baseline.
 */
export function getBaselineIneligibilityReasonLabel(
  reason: BuildBaselineIneligibilityReason,
): string {
  switch (reason) {
    case BuildBaselineIneligibilityReason.BuildIncomplete:
      return "The build is not complete yet.";
    case BuildBaselineIneligibilityReason.TestsFailed:
      return "Some end-to-end tests did not pass.";
    case BuildBaselineIneligibilityReason.Subset:
      return "The build is marked as a subset, so it only contains part of the snapshots.";
    case BuildBaselineIneligibilityReason.Rejected:
      return "The build has been rejected.";
    case BuildBaselineIneligibilityReason.NotApproved:
      return "The build is not auto-approved, manually approved, or an orphan.";
    default:
      assertNever(reason);
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
          "All end-to-end tests passed successfully. This build is eligible to be used as a baseline.",
      };
    case TestReportStatus.Failed:
      return {
        label: "Failed",
        color: "danger" as const,
        icon: XIcon,
        description:
          "Some end-to-end tests failed. This build is not eligible to be used as a baseline.",
      };
    case TestReportStatus.Timedout:
      return {
        label: "Timed Out",
        color: "danger" as const,
        icon: ClockIcon,
        description:
          "Some end-to-end tests timed out. This build is not eligible to be used as a baseline.",
      };
    case TestReportStatus.Interrupted:
      return {
        label: "Interrupted",
        color: "danger" as const,
        icon: PauseIcon,
        description:
          "Some end-to-end tests were interrupted. This build is not eligible to be used as a baseline.",
      };
    default:
      assertNever(status);
  }
}
