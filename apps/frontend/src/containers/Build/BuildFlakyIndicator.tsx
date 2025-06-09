import type { ComponentPropsWithRef } from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { ShieldCheckIcon, WavesIcon, type LucideIcon } from "lucide-react";
import { useNumberFormatter } from "react-aria";
import { Link } from "react-router-dom";

import type { Diff } from "@/pages/Build/BuildDiffState";
import { getTestURL } from "@/pages/Test/TestParams";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";
import { lowTextColorClassNames } from "@/util/colors";

import { getFlakinessUIColor } from "../Test/Flakiness";

export function BuildFlakyIndicator(props: {
  diff: Diff;
  accountSlug: string;
  projectName: string;
}) {
  const { diff, accountSlug, projectName } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  invariant(diff.test, "BuildFlakyIndicator requires a diff with a test");

  const testLink = (
    <Link
      to={getTestURL(
        {
          accountSlug,
          projectName,
          testId: diff.test.id,
        },
        { change: diff.changeId },
      )}
      className="underline decoration-1 underline-offset-2"
    >
      View complete test details
    </Link>
  );

  if (diff.last7daysOccurences > 0) {
    return (
      <Tooltip
        disableHoverableContent={false}
        content={
          <TooltipContainer>
            <TooltipHeader
              icon={WavesIcon}
              className="text-danger-low font-semibold"
            >
              Test is flaky
            </TooltipHeader>
            <p>
              <strong>
                {diff.last7daysOccurences} /{" "}
                {diff.test.last7daysMetrics.all.total} auto-approved builds
              </strong>{" "}
              showed exactly the same change in the last 7 days.
            </p>
            <p>{testLink}</p>
          </TooltipContainer>
        }
      >
        <Chip icon={WavesIcon} color="danger" scale="xs" {...props}>
          {diff.last7daysOccurences} / {diff.test.last7daysMetrics.all.total}
        </Chip>
      </Tooltip>
    );
  }

  if (diff.test.last7daysMetrics.all.flakiness > 0) {
    const color = getFlakinessUIColor(diff.test.last7daysMetrics.all.flakiness);
    return (
      <Tooltip
        disableHoverableContent={false}
        content={
          <TooltipContainer>
            <TooltipHeader
              icon={WavesIcon}
              className={lowTextColorClassNames[color]}
            >
              {(() => {
                switch (color) {
                  case "danger":
                    return "Test is flaky";
                  case "warning":
                    return "Test might be flaky";
                  case "success":
                    return "Test is mostly stable";
                  default:
                    assertNever(color, "Unknown flakiness color");
                }
              })()}
            </TooltipHeader>
            <p>
              Flaky test score{" "}
              <strong>
                {compactFormatter.format(
                  diff.test.last7daysMetrics.all.flakiness * 100,
                )}
                %
              </strong>{" "}
              over the last 7 days.
            </p>
            <p>{testLink}</p>
          </TooltipContainer>
        }
      >
        <Chip icon={WavesIcon} color={color} scale="xs" {...props}>
          {compactFormatter.format(
            diff.test.last7daysMetrics.all.flakiness * 100,
          )}
          <small>%</small>
        </Chip>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      disableHoverableContent={false}
      content={
        <TooltipContainer>
          <p>This test has been 100% stable over the last 7 days.</p>
          <p>{testLink}</p>
        </TooltipContainer>
      }
    >
      <Chip icon={ShieldCheckIcon} color="success" scale="xs" {...props}>
        Stable
      </Chip>
    </Tooltip>
  );
}

function TooltipContainer(props: ComponentPropsWithRef<"div">) {
  return <div className="flex flex-col items-start gap-0.5" {...props} />;
}

function TooltipHeader(
  props: ComponentPropsWithRef<"h3"> & {
    icon: LucideIcon;
  },
) {
  const { icon: Icon, ...rest } = props;
  return (
    <h3 {...rest} className={clsx("mb-0.5 font-semibold", rest.className)}>
      <Icon className="mr-1 inline size-3 align-middle" />
      {props.children}
    </h3>
  );
}
