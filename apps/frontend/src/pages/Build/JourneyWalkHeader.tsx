import { useMemo } from "react";
import { getStepLabel } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  WaypointsIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { HeadlessLink } from "@/ui/Link";
import { Menu, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState, type BuildJourney } from "./BuildDiffState";
import { getJourneyAnchor } from "./BuildOverview/JourneysSection";
import {
  getBuildOverviewURL,
  useBuildParams,
  type BuildParams,
} from "./BuildParams";
import type { EvaluationStatus } from "./EvaluationStatus";
import {
  checkIsJourneyDiff,
  getJourneyRunHints,
  getJourneyTestKey,
  getRunCapture,
} from "./journey-hints";
import { getTestsInReviewOrder } from "./journey-order";
import {
  getJourneyRunLabel,
  getJourneyTestFiles,
  getJourneyTestMenuItems,
  useReviewStatuses,
} from "./journey-tests";
import { getJourneyScreenURL } from "./metadata/filters/util";
import { getViewportIconKind, viewportIcons } from "./metadata/metadataIcons";
import { resolveDiffMetadata } from "./metadata/utils";

/**
 * Where walking `journey` starts, or picks up at the screen of `stepKey` when
 * it has one: switching runs keeps the review on the same screen.
 */
function getJourneyURL(
  params: BuildParams,
  journey: BuildJourney,
  stepKey?: string | null,
): string {
  const diffId = (() => {
    if (stepKey) {
      // Runs may name their screens apart (`desktop/cart`, `mobile/cart`):
      // the last part of the name is the screen.
      const exactIndex = journey.stepKeys.indexOf(stepKey);
      const stepIndex =
        exactIndex === -1
          ? journey.stepKeys.findIndex(
              (key) => getStepLabel(key) === getStepLabel(stepKey),
            )
          : exactIndex;
      const diffId =
        stepIndex === -1
          ? null
          : journey.variants
              .map((variant) => variant.diffIds[stepIndex])
              .find(Boolean);
      if (diffId) {
        return diffId;
      }
    }
    return journey.variants.flatMap((variant) => variant.diffIds).find(Boolean);
  })();
  invariant(diffId, "a journey has a screen");
  return getJourneyScreenURL(params, journey.id, diffId);
}

/**
 * The run of another test to go on with: the one taken where the review is,
 * same browser and viewport, so a review on mobile stays on mobile.
 */
function pickRun(runs: BuildJourney[], current: BuildJourney): BuildJourney {
  const [first] = runs;
  invariant(first, "a test has a run");
  const capture = getRunCapture(current);
  return (
    runs.find((run) => {
      const other = getRunCapture(run);
      return (
        other.browser === capture.browser &&
        other.viewport?.width === capture.viewport?.width &&
        other.viewport?.height === capture.viewport?.height
      );
    }) ?? first
  );
}

/**
 * Names the journey the review walks, above the list of its screens; the
 * strip above the screenshot shows where the review is in it. From here the
 * review moves on to another journey: the previous or next one in the
 * overview's order, or any of them from the title. Closing it goes back to
 * the overview, at the journey, where it was picked.
 */
export function JourneyWalkHeader() {
  const { walkedJourneys, activeDiff, journeys } = useBuildDiffState();
  const statuses = useReviewStatuses();
  const params = useBuildParams();
  invariant(params, "a journey is walked on a build page");
  const metadata = activeDiff ? resolveDiffMetadata(activeDiff) : null;
  return (
    <JourneyWalkHeaderView
      journeys={journeys}
      walkedJourneys={walkedJourneys}
      active={
        activeDiff
          ? {
              diffId: activeDiff.id,
              viewport: metadata?.viewport ?? null,
              browser: metadata?.browser?.name ?? null,
            }
          : null
      }
      statuses={statuses}
      params={params}
    />
  );
}

/** The screenshot the review shows, as the walk header reads it. */
type ActiveScreen = {
  diffId: string;
  viewport: { width: number; height: number } | null;
  browser: string | null;
};

export function JourneyWalkHeaderView(props: {
  journeys: BuildJourney[];
  walkedJourneys: BuildJourney[];
  active: ActiveScreen | null;
  /** The viewer's marks in the review under way, by diff id. */
  statuses: Record<string, EvaluationStatus>;
  params: BuildParams;
}) {
  const { journeys, walkedJourneys, active, statuses, params } = props;
  const groups = useMemo(
    () => getJourneyTestFiles(journeys, statuses),
    [journeys, statuses],
  );
  const journey =
    walkedJourneys.find(
      (journey) => active && checkIsJourneyDiff(journey, active.diffId),
    ) ?? walkedJourneys[0];
  const testKey = journey ? getJourneyTestKey(journey) : null;
  // The rows of every test, built again only when the walk moves to another
  // journey: a step of the walk leaves them as they are.
  const menuItems = useMemo(
    () =>
      journey
        ? getJourneyTestMenuItems(groups, (item) => ({
            href: getJourneyURL(params, pickRun(item.journeys, journey)),
            checked: item.key === testKey,
          }))
        : null,
    [groups, journey, params, testKey],
  );
  if (!journey) {
    return null;
  }
  const tests = getTestsInReviewOrder(groups);
  const index = tests.findIndex((test) => test.key === testKey);
  const test = tests[index];
  invariant(test, "a walked journey is one of the build's");
  const getTestURL = (target: (typeof tests)[number]) =>
    getJourneyURL(params, pickRun(target.journeys, journey));
  const previous = tests[index - 1];
  const next = tests[index + 1];
  const activeStepIndex = active
    ? journey.variants
        .map((variant) => variant.diffIds.indexOf(active.diffId))
        .find((index) => index !== -1)
    : undefined;
  const activeStepKey =
    activeStepIndex === undefined
      ? null
      : (journey.stepKeys[activeStepIndex] ?? null);
  return (
    <section
      aria-label="Journey"
      className="border-b-thin flex flex-col gap-1 px-3 pt-2.5 pb-3"
    >
      <div className="flex items-center gap-0.5">
        <span className="text-primary-low flex flex-1 items-center gap-1.5 text-xs font-medium tabular-nums">
          <WaypointsIcon className="size-3.5" />
          Journey {index + 1} of {tests.length}
        </span>
        <HeaderLink
          label="Previous journey"
          icon={ChevronLeftIcon}
          href={previous ? getTestURL(previous) : null}
        />
        <HeaderLink
          label="Next journey"
          icon={ChevronRightIcon}
          href={next ? getTestURL(next) : null}
        />
        <HeaderLink
          label="Back to the overview"
          icon={XIcon}
          href={`${getBuildOverviewURL(params)}#${getJourneyAnchor(journey.id)}`}
        />
      </div>
      {journey.prefix ? (
        <div className="text-low text-xs wrap-break-word">{journey.prefix}</div>
      ) : null}
      <h2>
        <MenuRoot>
          <MenuTrigger>
            <button
              type="button"
              className="focus-ring hover:bg-hover aria-expanded:bg-active -mx-1.5 flex w-[calc(100%+0.75rem)] cursor-default items-start gap-1.5 rounded-md px-1.5 py-0.5 text-left text-sm/snug font-medium transition"
            >
              <span className="min-w-0 flex-1">{journey.title}</span>
              <ChevronsUpDownIcon className="text-low mt-0.5 size-4 shrink-0" />
            </button>
          </MenuTrigger>
          <Menu aria-label="Journeys" search="Search journeys…">
            {menuItems}
          </Menu>
        </MenuRoot>
      </h2>
      {test.journeys.length > 1 ? (
        <RunSwitch
          runs={test.journeys}
          current={journey}
          getURL={(run) => getJourneyURL(params, run, activeStepKey)}
        />
      ) : (
        <RunLine journey={journey} active={active} />
      )}
    </section>
  );
}

function HeaderLink(props: {
  label: string;
  icon: LucideIcon;
  href: string | null;
}) {
  const { label, icon: Icon, href } = props;
  const className = "focus-ring text-low rounded-sm p-0.5 transition";
  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className={clsx(className, "opacity-disabled")}
      >
        <Icon className="size-3.5" />
      </button>
    );
  }
  return (
    <Tooltip content={label}>
      <HeadlessLink
        href={href}
        aria-label={label}
        className={clsx(className, "hover:bg-ui hover:text-default")}
      >
        <Icon className="size-3.5" />
      </HeadlessLink>
    </Tooltip>
  );
}

/**
 * The runs of the walked test, the current one marked: another one opens on
 * the same screen.
 */
function RunSwitch(props: {
  runs: BuildJourney[];
  current: BuildJourney;
  getURL: (run: BuildJourney) => string;
}) {
  const { runs, current, getURL } = props;
  const hints = getJourneyRunHints(runs);
  return (
    <nav aria-label="Runs" className="flex flex-wrap gap-1">
      {runs.map((run) => {
        const isCurrent = run.id === current.id;
        const { viewport } = getRunCapture(run);
        const ViewportIcon = viewport
          ? viewportIcons[getViewportIconKind(viewport.width)]
          : null;
        return (
          <HeadlessLink
            key={run.id}
            href={getURL(run)}
            aria-current={isCurrent ? "true" : undefined}
            className={clsx(
              "focus-ring border-thin flex h-6 items-center gap-1 rounded-md px-1.5 text-xs tabular-nums transition",
              isCurrent
                ? "bg-active text-default font-medium"
                : "text-low hover:bg-hover hover:text-default",
            )}
          >
            {ViewportIcon ? (
              <ViewportIcon className="size-3.5 shrink-0" />
            ) : null}
            {getJourneyRunLabel(hints.get(run.id))}
          </HeadlessLink>
        );
      })}
    </nav>
  );
}

/**
 * The walked run, when its test has no other. A run can take its screens at
 * several sizes (Argos's `viewports` option): the one walked is the active
 * screen's.
 */
function RunLine(props: {
  journey: BuildJourney;
  active: ActiveScreen | null;
}) {
  const { journey, active } = props;
  const capture = getRunCapture(journey);
  const viewport = active?.viewport ?? capture.viewport;
  const label = getJourneyRunLabel({
    viewport,
    browser: active?.browser ?? capture.browser,
  });
  if (!label) {
    return null;
  }
  const ViewportIcon = viewport
    ? viewportIcons[getViewportIconKind(viewport.width)]
    : null;
  return (
    <div className="text-low flex items-center gap-1.5 text-xs tabular-nums">
      {ViewportIcon ? <ViewportIcon className="size-3.5 shrink-0" /> : null}
      {label}
    </div>
  );
}
