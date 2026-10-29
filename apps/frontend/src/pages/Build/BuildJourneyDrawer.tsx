import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { ChevronRightIcon, WaypointsIcon } from "lucide-react";

import {
  type DiffGroupName,
  getDiffGroupDefinition,
  getDiffStatusGroup,
} from "@/containers/Build/BuildDiffGroup";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { getPlainArrowDirection } from "@/containers/Build/hotkeys";
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

/** Opens the step `delta` away from the active one, across status sections. */
function useGoToJourneyStep() {
  const journey = useActiveDiffJourney();
  const { activeDiff, setActiveDiff } = useBuildDiffState();
  return useEventCallback((delta: -1 | 1) => {
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
}

/**
 * ⇧← / ⇧→ walk the journey of the active diff from anywhere on the page, the
 * drawer closed included.
 */
export function JourneyStepHotkeys() {
  const goToStep = useGoToJourneyStep();
  useBuildHotkey("goToPreviousJourneyStep", () => goToStep(-1), {
    preventDefault: true,
  });
  useBuildHotkey("goToNextJourneyStep", () => goToStep(1), {
    preventDefault: true,
  });
  return null;
}

function useFocusFollowsActiveStep(
  stripRef: React.RefObject<HTMLElement | null>,
) {
  const journey = useActiveDiffJourney();
  const activeStepKey = journey?.steps[journey.stepIndex]?.key;
  useEffect(() => {
    const strip = stripRef.current;
    if (strip?.contains(document.activeElement)) {
      strip.querySelector<HTMLElement>("[aria-current='step']")?.focus();
    }
  }, [stripRef, activeStepKey]);
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
  context: { isSubsetBuild: boolean },
): string[] {
  const statuses = new Set(
    step.diffs.map((diff) => getDiffStatusGroup(diff.status, context)),
  );
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
  const { activeDiff, setActiveDiff, isSubsetBuild } = useBuildDiffState();
  const goToStep = useGoToJourneyStep();
  const stripRef = useRef<HTMLDivElement>(null);
  useFocusFollowsActiveStep(stripRef);
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
    // selection ring of edge thumbnails from being clipped by the scroll
    // container.
    <div className="shrink-0 px-4 pt-2" data-testid="journey-drawer">
      <div
        ref={stripRef}
        role="toolbar"
        aria-label="Journey"
        onKeyDown={(event) => {
          const direction = getPlainArrowDirection(event);
          if (direction) {
            event.preventDefault();
            goToStep(direction);
          }
        }}
        className="bg-app border-thin flex items-center gap-1 overflow-x-auto rounded-md px-2 pt-2 pb-1.5"
      >
        {journey.steps.map((step, index) => {
          const diff = pickStepDiff(step, activeDiff);
          if (!diff) {
            return null;
          }
          const isActive = index === journey.stepIndex;
          const attentionLabels = getAttentionLabels(step, { isSubsetBuild });
          return (
            <div key={step.key} className="flex shrink-0 items-center gap-0.5">
              {index > 0 && (
                <ChevronRightIcon className="text-low size-3 shrink-0" />
              )}
              <button
                type="button"
                data-journey-step={step.key}
                aria-current={isActive ? "step" : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveDiff(diff, true)}
                className={clsx(
                  // Focus only ever sits on the active step, and its ring
                  // already marks it: a focus outline would mark it twice.
                  "flex flex-col items-center gap-1 rounded-md p-1 outline-none",
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
