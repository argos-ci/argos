import { useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { WaypointsIcon } from "lucide-react";

import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";

import {
  pickStepDiff,
  useBuildDiffState,
  useBuildJourneys,
  type Diff,
} from "../BuildDiffState";
import { checkDiffNeedsAttention } from "../BuildJourneyDrawer";
import { getBuildURL, useBuildParams } from "../BuildParams";
import {
  getJourneyRunHints,
  type Journey,
  type JourneyRunHint,
} from "../journey-model";
import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../metadata/browser/browserLabels";
import { serializeJourneySearch } from "../metadata/filters/util";
import { getViewportIconKind, viewportIcons } from "../metadata/metadataIcons";
import { resolveDiffMetadata } from "../metadata/utils";
import { ScreenshotDiffThumbnail } from "../sidebar/ScreenshotDiffThumbnail";

const COLLAPSED_JOURNEY_COUNT = 6;

type JourneyCardModel = {
  journey: Journey<Diff>;
  /** Which steps the strip marks, in step order. */
  attention: boolean[];
  /** The screen the card shows: the first one that changed. */
  coverDiff: Diff;
  /** The first screen of the journey, in the variant of the cover. */
  startDiff: Diff;
  /** What tells it apart from the journeys under the same title. */
  hint: JourneyRunHint | null;
};

function getJourneyCardModel(
  journey: Journey<Diff>,
  context: { isSubsetBuild: boolean; hint: JourneyRunHint | null },
): JourneyCardModel {
  const attention = journey.steps.map((step) =>
    step.diffs.some((diff) => checkDiffNeedsAttention(diff, context)),
  );
  const coverStep = journey.steps[Math.max(attention.indexOf(true), 0)];
  const coverDiff =
    coverStep?.diffs.find((diff) => checkDiffNeedsAttention(diff, context)) ??
    coverStep?.diffs[0];
  invariant(coverDiff, "a journey step has at least one screenshot");
  const [firstStep] = journey.steps;
  invariant(firstStep, "a journey has at least one step");
  const startDiff = pickStepDiff(firstStep, coverDiff);
  invariant(startDiff, "a journey step has at least one screenshot");
  return { journey, attention, coverDiff, startDiff, hint: context.hint };
}

/**
 * The build's journeys, a card each, the ones that changed first. A card opens
 * the build on the journey's first screen with the journey filter on, so the
 * review walks it screen by screen, the way a user clicks through the app.
 */
export function JourneysSection(props: { storybook: boolean }) {
  const { isLoading, isSubsetBuild } = useBuildDiffState();
  const journeys = useBuildJourneys();
  const [expanded, setExpanded] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  // Journeys are read from the whole list: until it has loaded, cards would
  // keep appearing and moving.
  if (props.storybook || isLoading || journeys.length === 0) {
    return null;
  }
  const runHints = getJourneyRunHints(journeys, resolveDiffMetadata);
  const cards = journeys.map((journey) =>
    getJourneyCardModel(journey, {
      isSubsetBuild,
      hint: runHints.get(journey.identity.key) ?? null,
    }),
  );
  const changed = cards.filter((card) => card.attention.includes(true));
  const unchanged = cards.filter((card) => !card.attention.includes(true));
  const collapsible = changed.length > COLLAPSED_JOURNEY_COUNT + 1;
  const visible = [
    ...(collapsible && !expanded
      ? changed.slice(0, COLLAPSED_JOURNEY_COUNT)
      : changed),
    ...(showUnchanged ? unchanged : []),
  ];
  return (
    <Panel elevation={0}>
      <PanelHeader className="mb-2">
        <PanelTitle icon={WaypointsIcon}>Journeys</PanelTitle>
      </PanelHeader>
      {visible.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),1fr))] gap-3 px-2">
          {visible.map((card) => (
            <li key={card.journey.identity.key} className="min-w-0">
              <JourneyCard card={card} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mx-2 mt-3 flex flex-wrap gap-2 empty:hidden">
        {collapsible && !expanded ? (
          <SectionButton onClick={() => setExpanded(true)}>
            View all {changed.length} journeys
          </SectionButton>
        ) : null}
        {unchanged.length > 0 && !showUnchanged ? (
          <SectionButton onClick={() => setShowUnchanged(true)}>
            Show {unchanged.length} unchanged{" "}
            {unchanged.length === 1 ? "journey" : "journeys"}
          </SectionButton>
        ) : null}
      </div>
    </Panel>
  );
}

function SectionButton(props: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="focus-ring text-low hover:bg-ui hover:text-default cursor-default rounded-full px-2 py-0.5 text-sm transition"
    >
      {props.children}
    </button>
  );
}

function JourneyCard(props: { card: JourneyCardModel }) {
  const { journey, attention, coverDiff, startDiff, hint } = props.card;
  const params = useBuildParams();
  invariant(params, "a journey card is rendered on a build page");
  const changedCount = attention.filter(Boolean).length;
  const stepCount = journey.steps.length;
  const viewportWidth = resolveDiffMetadata(coverDiff)?.viewport?.width;
  const ViewportIcon =
    viewportWidth !== undefined
      ? viewportIcons[getViewportIconKind(viewportWidth)]
      : null;
  return (
    <HeadlessLink
      href={serializeJourneySearch(
        getBuildURL({ ...params, diffId: startDiff.id }),
        { journey: new Set([journey.identity.key]) },
      )}
      className="border-thin bg-app hover:bg-subtle flex flex-col gap-2 rounded-md p-2 transition"
    >
      <ScreenshotDiffThumbnail
        screenshotDiff={coverDiff}
        className="h-28 w-full"
        iconClassName="mx-auto my-10 size-8"
        fit="cover"
        // A top crop at 2x the rendered box, like the journey strip.
        transformations={["w-512", "h-224", "fo-top"]}
      />
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="min-w-0">
          {journey.identity.prefix ? (
            <div className="text-low truncate text-xs">
              {journey.identity.prefix}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            {hint?.browser ? (
              <BrowserIcon
                browser={{ name: hint.browser }}
                className="size-3.5 shrink-0"
                title={getBrowserLabel(hint.browser)}
              />
            ) : null}
            {ViewportIcon ? (
              <ViewportIcon className="text-low size-3.5 shrink-0" />
            ) : null}
            <span className="truncate text-sm font-medium">
              {journey.identity.title}
            </span>
          </div>
        </div>
        <div className="flex gap-0.5" aria-hidden>
          {attention.map((marked, index) => (
            <span
              key={journey.steps[index]?.key ?? index}
              className={clsx(
                "h-1 min-w-0 flex-1 rounded-full",
                marked ? "bg-warning-solid" : "bg-ui",
              )}
            />
          ))}
        </div>
        <div className="text-low text-xs tabular-nums">
          {changedCount > 0
            ? `${changedCount} of ${stepCount} screens changed`
            : `${stepCount} screens`}
        </div>
      </div>
    </HeadlessLink>
  );
}
