import { clsx } from "clsx";
import { ChevronRightIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import { getStepLabel, getVariantLabel } from "@/util/flow-model";

import {
  useActiveDiffFlow,
  useBuildDiffState,
  useFlowMinimapState,
} from "./BuildDiffState";
import { ScreenshotDiffThumbnail } from "./sidebar/ScreenshotDiffThumbnail";

/**
 * ⇧← / ⇧→ walk the journey of the active diff, across status sections —
 * the keyboard counterpart of the minimap (and independent from it).
 */
export function FlowStepHotkeys() {
  const flow = useActiveDiffFlow();
  const { activeDiff, setActiveDiff } = useBuildDiffState();
  const goToStep = useEventCallback((delta: -1 | 1) => {
    if (!flow || !activeDiff) {
      return;
    }
    const target = flow.steps[flow.stepIndex + delta];
    if (!target) {
      return;
    }
    const activeVariantLabel = getVariantLabel(activeDiff.name);
    const diff =
      target.diffs.find(
        (candidate) => getVariantLabel(candidate.name) === activeVariantLabel,
      ) ?? target.diffs[0];
    if (diff) {
      setActiveDiff(diff, true);
    }
  });
  useBuildHotkey("goToPreviousFlowStep", () => goToStep(-1), {
    preventDefault: true,
  });
  useBuildHotkey("goToNextFlowStep", () => goToStep(1), {
    preventDefault: true,
  });
  return null;
}

const ATTENTION_STATUSES: string[] = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
];

/**
 * The journey of the active diff as a strip of steps, on demand: shows where
 * the change sits in the flow and jumps between steps. Only rendered when
 * the user asked for it and the active diff belongs to a multi-step flow.
 */
export function BuildFlowMinimap() {
  const { visible } = useFlowMinimapState();
  const flow = useActiveDiffFlow();
  const { activeDiff, setActiveDiff } = useBuildDiffState();
  if (!visible || !flow || !activeDiff) {
    return null;
  }
  const activeVariantLabel = getVariantLabel(activeDiff.name);
  return (
    // The sticky toolbar has a `p-2` padding: compensate horizontally so the
    // top border spans the full width, and pad the scroll container so the
    // selection ring and focus outline of edge thumbnails don't get clipped.
    <div className="-mx-2 mt-2 flex items-center gap-1 overflow-x-auto border-t px-2 pt-2 pb-1.5">
      {flow.steps.map((step, index) => {
        // Show the variant matching the active diff so switching steps stays
        // within the same viewport/browser.
        const diff =
          step.diffs.find(
            (candidate) =>
              getVariantLabel(candidate.name) === activeVariantLabel,
          ) ??
          step.diffs[0] ??
          null;
        if (!diff) {
          return null;
        }
        const isActive = index === flow.stepIndex;
        const needsAttention = step.diffs.some((candidate) =>
          ATTENTION_STATUSES.includes(candidate.status),
        );
        return (
          <div key={step.key} className="flex shrink-0 items-center gap-0.5">
            {index > 0 && (
              <ChevronRightIcon className="text-low size-3 shrink-0" />
            )}
            <button
              type="button"
              data-flow-step={step.key}
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
                {needsAttention ? (
                  <span className="bg-warning-solid absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-(--background-color-app)" />
                ) : null}
              </span>
              <span
                className={clsx(
                  "w-18 truncate text-center text-[0.6875rem] leading-none",
                  isActive ? "font-medium" : "text-low",
                )}
              >
                {index + 1} · {getStepLabel(step.key)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
