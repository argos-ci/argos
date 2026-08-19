import { clsx } from "clsx";
import { ChevronRightIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import { getStepLabel } from "@/util/flow-model";

import {
  pickStepDiff,
  useActiveDiffFlow,
  useBuildDiffState,
  useFlowMinimapState,
} from "./BuildDiffState";
import { getViewportIconKind } from "./metadata/metadataIcons";
import { resolveDiffMetadata } from "./sidebar/metadata/utils";
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
    const diff = pickStepDiff(target, activeDiff);
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
  // The strip stays within the active diff's variant, so every box shares one
  // viewport: it can take its shape from it, portrait for a mobile run.
  const viewportWidth = resolveDiffMetadata(activeDiff)?.viewport?.width;
  const portrait =
    viewportWidth !== undefined &&
    getViewportIconKind(viewportWidth) === "mobile";
  return (
    // An inset card in the viewer column, aligned on the diff area gutters
    // (`p-4`) and styled like the diff panels. The inner padding keeps the
    // selection ring and focus outline of edge thumbnails from being
    // clipped by the scroll container.
    <div className="shrink-0 px-4 pt-2" data-testid="flow-minimap">
      <div className="bg-app border-thin flex items-center gap-1 overflow-x-auto rounded-md px-2 pt-2 pb-1.5">
        {flow.steps.map((step, index) => {
          const diff = pickStepDiff(step, activeDiff);
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
                aria-current={isActive ? "step" : undefined}
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
                      "h-12",
                      portrait ? "w-6.5" : "w-16",
                      isActive && "ring-primary-active ring-2",
                    )}
                    fit="cover"
                    // A top crop at 2x the rendered box. Fitting inside a
                    // square instead would hand `object-cover` a sliver of a
                    // full-page capture to upscale.
                    transformations={
                      portrait
                        ? ["w-52", "h-96", "fo-top"]
                        : ["w-128", "h-96", "fo-top"]
                    }
                  />
                  {needsAttention ? (
                    <span className="bg-warning-solid absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-(--background-color-app)" />
                  ) : null}
                </span>
                <span
                  className={clsx(
                    "max-w-28 truncate text-center text-[0.6875rem] leading-none",
                    isActive ? "font-medium" : "text-low",
                  )}
                  title={getStepLabel(step.key)}
                >
                  {index + 1} · {getStepLabel(step.key)}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
