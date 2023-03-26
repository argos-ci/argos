import {
  BugAntIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import moment from "moment";

import { TestStatus } from "@/gql/graphql";

import { Chip } from "./Chip";
import { MagicTooltip } from "./Tooltip";

const FlakyIcon = BugAntIcon;
const flakySuspectedTooltip =
  "This test has high instability in recent builds and may be a flaky.";

export const FlakySuspectedIcon = () => {
  return (
    <MagicTooltip tooltip={flakySuspectedTooltip}>
      <FlakyIcon className="text-warning-400" />
    </MagicTooltip>
  );
};

export const FlakySuspectedChip = () => {
  return (
    <MagicTooltip tooltip={flakySuspectedTooltip}>
      <Chip icon={FlakyIcon} color="warning" scale="sm">
        Flaky suspected
      </Chip>
    </MagicTooltip>
  );
};

const getFlakyIndicatorProps = ({
  status,
  unstable,
  resolvedDate,
}: {
  status: TestStatus;
  unstable: boolean;
  resolvedDate: string | null;
}) => {
  const updatedStatus =
    status === "resolved"
      ? resolvedDate && moment().subtract(7, "days").isAfter(resolvedDate)
        ? "pending"
        : "resolved"
      : status;

  switch (updatedStatus) {
    case "pending":
      return unstable
        ? {
            label: "Unstable",
            color: "warning" as const,
            icon: ExclamationTriangleIcon,
            tooltip: "This test is unstable with potential flakiness",
          }
        : { label: null, color: "neutral" as const, icon: null };

    case "flaky":
      return {
        label: "Flaky",
        color: "danger" as const,
        icon: FlakyIcon,
        tooltip: "This test is unreliable and may have false positives",
      };

    case "resolved":
      return {
        label: "Resolved",
        color: "success" as const,
        icon: CheckCircleIcon,
        tooltip: `This test has been resolved and its stability score reset${
          resolvedDate ? ` on: ${moment(resolvedDate).format("LLL")}` : ""
        }`,
      };

    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

export const FlakyChip = ({
  status,
  unstable,
  resolvedDate,
}: {
  status: TestStatus;
  unstable: boolean;
  resolvedDate?: string | null;
}) => {
  const {
    label,
    color,
    icon: Icon,
    tooltip,
  } = getFlakyIndicatorProps({
    status,
    unstable,
    resolvedDate: resolvedDate ?? null,
  });
  if (!label) {
    return null;
  }

  return (
    <MagicTooltip tooltip={tooltip}>
      <Chip icon={Icon} color={color} scale="sm">
        {label}
      </Chip>
    </MagicTooltip>
  );
};
