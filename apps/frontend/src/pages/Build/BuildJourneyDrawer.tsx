import { clsx } from "clsx";
import { ChevronRightIcon, WaypointsIcon } from "lucide-react";

import {
  type DiffGroupName,
  getDiffGroupDefinition,
} from "@/containers/Build/BuildDiffGroup";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";

import {
  type ActiveDiffJourney,
  pickStepDiff,
  useActiveDiffJourney,
  useBuildDiffState,
  useJourneyDrawerState,
} from "./BuildDiffState";
import { getStepLabel } from "./journey-model";
import { getViewportIconKind } from "./metadata/metadataIcons";
import { resolveDiffMetadata } from "./metadata/utils";
import { ScreenshotDiffThumbnail } from "./sidebar/ScreenshotDiffThumbnail";

/**
 * ⇧← / ⇧→ walk the journey of the active diff, across status sections — the
 * keyboard counterpart of the drawer (and independent from it).
 */
export function JourneyStepHotkeys() {
  const journey = useActiveDiffJourney();
  const { activeDiff, setActiveDiff } = useBuildDiffState();
  const goToStep = useEventCallback((delta: -1 | 1) => {
    if (!journey || !activeDiff) {
      return;
    }
    const target = journey.steps[journey.stepIndex + delta];
    if (!target) {
      return;
    }
    const diff = pickStepDiff(target, activeDiff);
    if (diff) {
      setActiveDiff(diff, true);
    }
  });
  useBuildHotkey("goToPreviousJourneyStep", () => goToStep(-1), {
    preventDefault: true,
  });
  useBuildHotkey("goToNextJourneyStep", () => goToStep(1), {
    preventDefault: true,
  });
  return null;
}

/** What the dot marks: the statuses that put a diff in front of a reviewer. */
const ATTENTION_STATUSES = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
] as const satisfies DiffGroupName[];

/**
 * The statuses of a step worth a reviewer's attention, named as the rest of the
 * review names them, in the order the diff list sections come in.
 */
function getAttentionLabels(
  step: ActiveDiffJourney["steps"][number],
): string[] {
  const statuses = new Set(step.diffs.map((diff) => diff.status));
  return ATTENTION_STATUSES.filter((status) => statuses.has(status)).map(
    (status) => getDiffGroupDefinition(status).label,
  );
}

/**
 * The journey of the active diff as a strip of steps, on demand: shows where
 * the change sits in the journey and jumps between steps. Only rendered when
 * the user asked for it and the active diff belongs to a multi-step journey.
 */
export function BuildJourneyDrawer() {
  const { visible } = useJourneyDrawerState();
  const journey = useActiveDiffJourney();
  const { activeDiff, setActiveDiff } = useBuildDiffState();
  if (!visible || !journey || !activeDiff) {
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
    // selection ring and focus outline of edge thumbnails from being clipped
    // by the scroll container.
    <div className="shrink-0 px-4 pt-2" data-testid="journey-drawer">
      <div className="bg-app border-thin flex items-center gap-1 overflow-x-auto rounded-md px-2 pt-2 pb-1.5">
        {journey.steps.map((step, index) => {
          const diff = pickStepDiff(step, activeDiff);
          if (!diff) {
            return null;
          }
          const isActive = index === journey.stepIndex;
          const attentionLabels = getAttentionLabels(step);
          return (
            <div key={step.key} className="flex shrink-0 items-center gap-0.5">
              {index > 0 && (
                <ChevronRightIcon className="text-low size-3 shrink-0" />
              )}
              <button
                type="button"
                data-journey-step={step.key}
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
                  {attentionLabels.length > 0 ? (
                    <Tooltip
                      content={`Needs review: ${attentionLabels.join(", ")}`}
                    >
                      {/* The dot is 10px, so the padding around it is what the
                          pointer actually has to land on; the negative offsets
                          keep the dot itself where it was. */}
                      <span
                        data-testid="journey-step-attention"
                        className="absolute -top-2.5 -right-2.5 p-1.5"
                      >
                        <span className="bg-warning-solid block size-2.5 rounded-full ring-2 ring-(--background-color-app)" />
                      </span>
                    </Tooltip>
                  ) : null}
                </span>
                <Tooltip content={step.key}>
                  <span
                    className={clsx(
                      "max-w-28 truncate text-center text-[0.6875rem] leading-tight",
                      isActive ? "font-medium" : "text-low",
                    )}
                  >
                    {index + 1} · {getStepLabel(step.key)}
                  </span>
                </Tooltip>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Opens the drawer, and is the only sign a journey exists when it is closed —
 * so it renders only when the active diff belongs to one.
 */
export function JourneyDrawerToggle() {
  const journey = useActiveDiffJourney();
  const { visible, setVisible } = useJourneyDrawerState();
  if (!journey) {
    return null;
  }
  return (
    <Tooltip
      content={
        visible
          ? "Hide journey"
          : `Show journey · step ${journey.stepIndex + 1} of ${journey.steps.length}`
      }
    >
      <Button
        variant="secondary"
        iconOnly
        aria-label="Journey"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <WaypointsIcon />
      </Button>
    </Tooltip>
  );
}
