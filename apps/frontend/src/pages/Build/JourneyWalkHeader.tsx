import { use } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { WaypointsIcon, XIcon } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState } from "./BuildDiffState";
import { checkDiffNeedsAttention } from "./BuildJourneyDrawer";
import { getBrowserLabel } from "./metadata/browser/browserLabels";
import { FilterStateContext } from "./metadata/filters/FilterState";
import { FilterCategory, getFilterKey } from "./metadata/filters/util";
import { getViewportIconKind, viewportIcons } from "./metadata/metadataIcons";
import { formatViewport } from "./metadata/viewports/util";

/**
 * Names the journey the review walks, above the list of its screens, and where
 * the active screen sits in it. Leaving it brings the whole build back.
 */
export function JourneyWalkHeader() {
  const { walkedJourneys, activeDiff, isSubsetBuild } = useBuildDiffState();
  const filterState = use(FilterStateContext);
  invariant(filterState, "Must be used in a filter context");
  const getStepIndex = (journey: (typeof walkedJourneys)[number]) =>
    activeDiff
      ? journey.steps.findIndex((step) =>
          step.diffs.some((diff) => diff.id === activeDiff.id),
        )
      : -1;
  const journey =
    walkedJourneys.find((journey) => getStepIndex(journey) !== -1) ??
    walkedJourneys[0];
  if (!journey) {
    return null;
  }
  const stepIndex = getStepIndex(journey);
  const changedSteps = journey.steps.map((step) =>
    step.diffs.some((diff) => checkDiffNeedsAttention(diff, { isSubsetBuild })),
  );
  const changedCount = changedSteps.filter(Boolean).length;
  const ViewportIcon = journey.viewport
    ? viewportIcons[getViewportIconKind(journey.viewport.width)]
    : null;
  const run = [
    journey.viewport ? formatViewport(journey.viewport) : null,
    journey.browser ? getBrowserLabel(journey.browser) : null,
  ].filter(Boolean);
  const leave = () => {
    filterState.setActive(
      filterState.active.difference(
        new Set(
          walkedJourneys.map((journey) =>
            getFilterKey({
              category: FilterCategory.journey,
              value: journey.id,
            }),
          ),
        ),
      ),
    );
  };
  return (
    <section
      aria-label="Journey"
      className="border-b-thin flex flex-col gap-1 px-3 pt-2.5 pb-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-primary-low flex items-center gap-1.5 text-xs font-medium">
          <WaypointsIcon className="size-3.5" />
          Journey
        </span>
        <Tooltip content="Leave the journey">
          <button
            type="button"
            onClick={leave}
            aria-label="Leave the journey"
            className="focus-ring text-low hover:bg-ui hover:text-default -mr-1 cursor-default rounded-sm p-0.5 transition"
          >
            <XIcon className="size-3.5" />
          </button>
        </Tooltip>
      </div>
      {journey.prefix ? (
        <div className="text-low text-xs wrap-break-word">{journey.prefix}</div>
      ) : null}
      <h2 className="text-sm/snug font-medium">{journey.title}</h2>
      {run.length > 0 ? (
        <div className="text-low flex items-center gap-1.5 text-xs tabular-nums">
          {ViewportIcon ? <ViewportIcon className="size-3.5 shrink-0" /> : null}
          {run.join(" · ")}
        </div>
      ) : null}
      <div className="mt-2 flex gap-0.5" aria-hidden>
        {changedSteps.map((changed, index) => (
          <span
            key={journey.steps[index]?.key ?? index}
            className={clsx(
              "h-1 min-w-0 flex-1 rounded-full",
              index === stepIndex
                ? "bg-primary-solid"
                : changed
                  ? "bg-warning-solid"
                  : "bg-ui",
            )}
          />
        ))}
      </div>
      <div className="text-low mt-0.5 flex justify-between text-xs tabular-nums">
        <span>
          {stepIndex === -1
            ? `${journey.steps.length} screens`
            : `Screen ${stepIndex + 1} of ${journey.steps.length}`}
        </span>
        {changedCount > 0 ? (
          <span className="text-warning-low font-medium">
            {changedCount} changed
          </span>
        ) : null}
      </div>
    </section>
  );
}
