import {
  BugAntIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";

import { Chip } from "./Chip";
import { MagicTooltip } from "./Tooltip";

const TestStatus = ["pending", "flakyConfirmed", "notFlaky", "resolved"];

export type TestStatus = "pending" | "flaky" | "resolved";

const FlakyIcon = BugAntIcon;
const flakySuspectedTooltip =
  "This screenshot comparison has high instability in recent builds and may be a flaky.";

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

const getFlakyStatusColor = ({ status }: { status: TestStatus }) => {
  switch (status) {
    case "pending":
      return "neutral" as const;
    case "flaky":
      return "danger" as const;
    case "resolved":
      return "success" as const;
    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

const getFlakyStatusIcon = ({ status }: { status: TestStatus }) => {
  switch (status) {
    case "pending":
      return ExclamationTriangleIcon;
    case "flaky":
      return FlakyIcon;
    case "resolved":
      return CheckCircleIcon;
    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

const getFlakyStatusLabel = ({
  status,
  unstable,
}: {
  status: TestStatus;
  unstable: boolean;
}) => {
  switch (status) {
    case "pending":
      return unstable ? "Unstable" : null;
    case "flaky":
      return "Flaky";
    case "resolved":
      return "Resolved";
    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

export const FlakyChip = ({
  status,
  unstable,
}: {
  status: TestStatus;
  unstable: boolean;
}) => {
  const label = getFlakyStatusLabel({ status, unstable });
  if (!label) {
    return null;
  }

  const color = getFlakyStatusColor({ status });
  const Icon = getFlakyStatusIcon({ status });
  return (
    <MagicTooltip tooltip={flakySuspectedTooltip}>
      <Chip icon={Icon} color={color} scale="sm">
        {label}
      </Chip>
    </MagicTooltip>
  );
};
