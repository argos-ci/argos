import { BugIcon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import moment from "moment";

import { Test } from "@/gql/graphql";

import { Chip } from "./Chip";
import { Tooltip } from "./Tooltip";

export const getFlakyIndicatorProps = (
  test: Pick<Test, "status" | "unstable" | "resolvedDate">,
) => {
  const { status, unstable, resolvedDate } = test;

  switch (status) {
    case "pending":
      return unstable
        ? {
            label: "Test unstable",
            color: "warning" as const,
            icon: AlertTriangleIcon,
            tooltip:
              "High instability and potential flakiness detected in the past 7 days",
          }
        : { label: null, color: "neutral" as const, icon: null };

    case "flaky":
      return {
        label: "Flaky",
        color: "warning" as const,
        icon: BugIcon,
        tooltip: "Unreliable test that may have false positives",
      };

    case "resolved":
      return {
        label: "Resolved",
        color: "success" as const,
        icon: CheckCircle2Icon,
        tooltip: `This test has been resolved and its stability score reset${
          resolvedDate ? ` on: ${moment(resolvedDate).format("LLL")}` : ""
        }`,
      };

    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

export const FlakyChip = ({
  test,
  className,
}: {
  test: Pick<Test, "status" | "unstable" | "resolvedDate"> | null;
  className?: string;
}) => {
  if (!test || !test.status) {
    return null;
  }

  const { label, color, icon: Icon, tooltip } = getFlakyIndicatorProps(test);
  if (!label) {
    return null;
  }

  return (
    <Tooltip content={tooltip}>
      <Chip icon={Icon} color={color} scale="xs" className={className}>
        {label}
      </Chip>
    </Tooltip>
  );
};
