import { useMemo } from "react";
import { clsx } from "clsx";
import { ChevronRightIcon } from "lucide-react";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState, type Diff } from "./BuildDiffState";
import { resolveDiffMetadata } from "./sidebar/metadata/utils";
import { ScreenshotDiffThumbnail } from "./sidebar/ScreenshotDiffThumbnail";

type DiffFlow = {
  name: string;
  step: string | null;
  index: number | null;
};

function getDiffFlow(diff: Diff): DiffFlow | null {
  const flow = resolveDiffMetadata(diff)?.flow;
  if (!flow) {
    return null;
  }
  return {
    name: flow.name,
    step: flow.step ?? null,
    index: flow.index ?? null,
  };
}

/**
 * Statuses that deserve a marker on the strip. Unchanged steps stay quiet so
 * attention goes to the steps that moved.
 */
const STATUS_DOT_CLASSNAMES: Partial<Record<ScreenshotDiffStatus, string>> = {
  [ScreenshotDiffStatus.Failure]: "bg-danger-solid",
  [ScreenshotDiffStatus.Changed]: "bg-warning-solid",
  [ScreenshotDiffStatus.Added]: "bg-warning-solid",
  [ScreenshotDiffStatus.Removed]: "bg-warning-solid",
};

/**
 * When the active diff belongs to a user flow, renders the whole flow as an
 * ordered filmstrip so the reviewer sees where the change sits in the journey
 * and can jump between steps.
 */
export function BuildFlowStrip() {
  const { activeDiff, allDiffs, setActiveDiff } = useBuildDiffState();
  const activeFlow = activeDiff ? getDiffFlow(activeDiff) : null;
  const flowName = activeFlow?.name ?? null;
  const steps = useMemo(() => {
    if (flowName === null) {
      return [];
    }
    return allDiffs
      .flatMap((diff) => {
        const flow = getDiffFlow(diff);
        return flow?.name === flowName ? [{ diff, flow }] : [];
      })
      .sort(
        (a, b) =>
          (a.flow.index ?? Number.MAX_SAFE_INTEGER) -
          (b.flow.index ?? Number.MAX_SAFE_INTEGER),
      );
  }, [allDiffs, flowName]);

  if (!activeDiff || !activeFlow || steps.length < 2) {
    return null;
  }

  const activePosition = steps.findIndex(
    ({ diff }) => diff.id === activeDiff.id,
  );

  return (
    <div className="mt-2 flex items-center gap-1 border-t pt-2">
      <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-3 pl-1">
        <div className="text-low text-[0.6875rem] font-medium tracking-wide uppercase">
          Flow
        </div>
        <div className="text-sm leading-none font-medium">
          {activeFlow.name}
        </div>
        <div className="text-low text-xs leading-none">
          Step {activePosition + 1} of {steps.length}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1">
        {steps.map(({ diff, flow }, index) => {
          const isActive = diff.id === activeDiff.id;
          const dotClassName = STATUS_DOT_CLASSNAMES[diff.status];
          const label = flow.step ?? diff.name;
          return (
            <div key={diff.id} className="flex shrink-0 items-center gap-0.5">
              {index > 0 && (
                <ChevronRightIcon className="text-low size-3 shrink-0" />
              )}
              <Tooltip content={label}>
                <button
                  type="button"
                  onClick={() => setActiveDiff(diff, true)}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-md p-1",
                    !isActive && "hover:bg-hover",
                  )}
                >
                  <span className="relative">
                    <ScreenshotDiffThumbnail
                      screenshotDiff={diff}
                      className={clsx(
                        "h-12 w-16",
                        isActive && "ring-primary-active ring-2",
                      )}
                      fit="cover"
                    />
                    {dotClassName && (
                      <span
                        className={clsx(
                          "absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-(--background-color-app)",
                          dotClassName,
                        )}
                      />
                    )}
                  </span>
                  <span
                    className={clsx(
                      "w-18 truncate text-center text-[0.6875rem] leading-none",
                      isActive ? "font-medium" : "text-low",
                    )}
                  >
                    {flow.index ?? index + 1}
                    {" · "}
                    {label}
                  </span>
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}
