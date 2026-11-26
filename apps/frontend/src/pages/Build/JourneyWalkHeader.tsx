import { Fragment } from "react";
import { getStepLabel, walkJourneySteps } from "@argos/schemas/journey";
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
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState, type BuildJourney } from "./BuildDiffState";
import { getJourneyAnchor } from "./BuildOverview/JourneysSection";
import {
  getBuildOverviewURL,
  getBuildURL,
  useBuildParams,
  type BuildParams,
} from "./BuildParams";
import { getJourneyRunHints, getJourneyTestKey } from "./journey-hints";
import { getTestsInReviewOrder, listJourneyTestFiles } from "./journey-order";
import {
  getJourneyRunLabel,
  getJourneyTestFiles,
  getJourneyTestSummary,
  getTestContext,
  JourneyStatusIcon,
  useJourneyStatusContext,
} from "./journey-tests";
import { getBrowserLabel } from "./metadata/browser/browserLabels";
import { serializeJourneySearch } from "./metadata/filters/util";
import { getViewportIconKind, viewportIcons } from "./metadata/metadataIcons";
import { resolveDiffMetadata } from "./metadata/utils";
import { formatViewport } from "./metadata/viewports/util";

/**
 * Where walking `journey` starts, or picks up at the screen of `stepKey` when
 * it has one: switching runs keeps the review on the same screen.
 */
function getJourneyURL(
  params: BuildParams,
  journey: BuildJourney,
  stepKey?: string | null,
): string {
  // Runs may name their screens apart (`desktop/cart`, `mobile/cart`): the
  // last part of the name is the screen.
  const step = stepKey
    ? (journey.steps.find((step) => step.key === stepKey) ??
      journey.steps.find(
        (step) => getStepLabel(step.key) === getStepLabel(stepKey),
      ))
    : null;
  const [diff] = step ? step.diffs : walkJourneySteps(journey.steps);
  invariant(diff, "a journey has a screen");
  return serializeJourneySearch(getBuildURL({ ...params, diffId: diff.id }), {
    journey: new Set([journey.id]),
  });
}

/**
 * The run of another test to go on with: the one taken where the review is,
 * same browser and viewport, so a review on mobile stays on mobile.
 */
function pickRun(runs: BuildJourney[], current: BuildJourney): BuildJourney {
  const [first] = runs;
  invariant(first, "a test has a run");
  return (
    runs.find(
      (run) =>
        run.browser === current.browser &&
        run.viewport?.width === current.viewport?.width &&
        run.viewport?.height === current.viewport?.height,
    ) ?? first
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
  const statusContext = useJourneyStatusContext();
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
  const groups = getJourneyTestFiles(journeys, statusContext);
  const tests = getTestsInReviewOrder(groups);
  const testKey = getJourneyTestKey(journey);
  const index = tests.findIndex((test) => test.key === testKey);
  const test = tests[index];
  invariant(test, "a walked journey is one of the build's");
  const getTestURL = (target: (typeof tests)[number]) =>
    getJourneyURL(params, pickRun(target.journeys, journey));
  const previous = tests[index - 1];
  const next = tests[index + 1];
  const activeStepKey =
    journey.steps.find((step) =>
      step.diffs.some((diff) => diff.id === activeDiff?.id),
    )?.key ?? null;
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
            {listJourneyTestFiles(groups).map(({ key, file, separated }) => (
              <Fragment key={key}>
                {separated ? <MenuSeparator /> : null}
                <MenuHeading>{file.path ?? file.name}</MenuHeading>
                {file.tests.map((item) => {
                  const context = getTestContext(item, file);
                  return (
                    <MenuItem
                      key={item.key}
                      href={getTestURL(item)}
                      wrap
                      checked={item.key === testKey}
                      textValue={[context, item.title]
                        .filter(Boolean)
                        .join(" › ")}
                      keywords={[file.path ?? file.name]}
                      subtitle={getJourneyTestSummary(item)}
                    >
                      {context ? (
                        <span className="text-low">{context} › </span>
                      ) : null}
                      {item.title}
                      <JourneyStatusIcon
                        status={item.status}
                        className="ml-1.5 inline size-3.5 align-[-0.125em]"
                      />
                    </MenuItem>
                  );
                })}
              </Fragment>
            ))}
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
        <RunLine journey={journey} />
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
        const ViewportIcon = run.viewport
          ? viewportIcons[getViewportIconKind(run.viewport.width)]
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
function RunLine(props: { journey: BuildJourney }) {
  const { journey } = props;
  const { activeDiff } = useBuildDiffState();
  const metadata = activeDiff ? resolveDiffMetadata(activeDiff) : null;
  const viewport = metadata?.viewport ?? journey.viewport;
  const browser = metadata?.browser?.name ?? journey.browser;
  const ViewportIcon = viewport
    ? viewportIcons[getViewportIconKind(viewport.width)]
    : null;
  const run = [
    viewport ? formatViewport(viewport) : null,
    browser ? getBrowserLabel(browser) : null,
  ].filter(Boolean);
  if (run.length === 0) {
    return null;
  }
  return (
    <div className="text-low flex items-center gap-1.5 text-xs tabular-nums">
      {ViewportIcon ? <ViewportIcon className="size-3.5 shrink-0" /> : null}
      {run.join(" · ")}
    </div>
  );
}
