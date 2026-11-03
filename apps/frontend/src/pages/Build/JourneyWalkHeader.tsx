import { invariant } from "@argos/util/invariant";
import { WaypointsIcon, XIcon } from "lucide-react";

import { HeadlessLink } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState } from "./BuildDiffState";
import { getBuildOverviewURL, useBuildParams } from "./BuildParams";
import { getBrowserLabel } from "./metadata/browser/browserLabels";
import { getViewportIconKind, viewportIcons } from "./metadata/metadataIcons";
import { formatViewport } from "./metadata/viewports/util";

/**
 * Names the journey the review walks, above the list of its screens; the
 * strip above the screenshot shows where the review is in it. Closing it goes
 * back to the overview, where the journey was picked.
 */
export function JourneyWalkHeader() {
  const { walkedJourneys, activeDiff } = useBuildDiffState();
  const params = useBuildParams();
  invariant(params, "a journey is walked on a build page");
  const journey =
    walkedJourneys.find((journey) =>
      journey.steps.some((step) =>
        step.diffs.some((diff) => diff.id === activeDiff?.id),
      ),
    ) ?? walkedJourneys[0];
  if (!journey) {
    return null;
  }
  const ViewportIcon = journey.viewport
    ? viewportIcons[getViewportIconKind(journey.viewport.width)]
    : null;
  const run = [
    journey.viewport ? formatViewport(journey.viewport) : null,
    journey.browser ? getBrowserLabel(journey.browser) : null,
  ].filter(Boolean);
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
        <Tooltip content="Back to the overview">
          <HeadlessLink
            href={getBuildOverviewURL(params)}
            aria-label="Back to the overview"
            className="focus-ring text-low hover:bg-ui hover:text-default -mr-1 rounded-sm p-0.5 transition"
          >
            <XIcon className="size-3.5" />
          </HeadlessLink>
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
    </section>
  );
}
