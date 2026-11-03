import { useState } from "react";
import { getStepLabel, getVariantSignature } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ArrowRightIcon, FileCodeIcon, WaypointsIcon } from "lucide-react";

import { getDiffGroupDefinition } from "@/containers/Build/BuildDiffGroup";
import { DocumentType, graphql } from "@/gql";
import type { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Tooltip } from "@/ui/Tooltip";
import { capitalize } from "@/util/string";

import { checkDiffNeedsAttention } from "../BuildJourneyDrawer";
import { getBuildURL, useBuildParams, type BuildParams } from "../BuildParams";
import { useBuildReviewState } from "../BuildReviewState";
import { EvaluationStatus } from "../EvaluationStatus";
import { getJourneyTestKey } from "../journey-hints";
import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../metadata/browser/browserLabels";
import { serializeJourneySearch } from "../metadata/filters/util";
import { getViewportIconKind, viewportIcons } from "../metadata/metadataIcons";
import { formatViewport } from "../metadata/viewports/util";
import { getLocationURL } from "../sidebar/metadata/LocationChip";
import { ScreenshotDiffThumbnail } from "../sidebar/ScreenshotDiffThumbnail";

const _JourneyFragment = graphql(`
  fragment JourneysSection_Journey on BuildJourney {
    id
    prefix
    title
    browser
    viewport {
      width
      height
    }
    location {
      file
      line
      column
    }
    steps {
      key
      diffs {
        id
        name
        variantKey
        status
        compareScreenshot {
          id
          metadata {
            colorScheme
            browser {
              name
            }
            viewport {
              width
              height
            }
          }
        }
        baseScreenshot {
          id
          metadata {
            colorScheme
            browser {
              name
            }
            viewport {
              width
              height
            }
          }
        }
        ...ScreenshotDiffThumbnail_ScreenshotDiff
      }
    }
  }
`);

const _BuildFragment = graphql(`
  fragment JourneysSection_Build on Build {
    subset
    branch
    journeys {
      ...JourneysSection_Journey
    }
    singleScreenTests {
      ...JourneysSection_Journey
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Journey = DocumentType<typeof _JourneyFragment>;
type JourneyDiff = Journey["steps"][number]["diffs"][number];

const COLLAPSED_JOURNEY_COUNT = 5;

type Viewport = { width: number; height: number };

type JourneyScreen = {
  label: string;
  /** The step's screenshot in the variant the run shows. */
  diff: JourneyDiff;
  changed: boolean;
};

type JourneyRun = {
  /** The journey and the variant of it the run shows. */
  key: string;
  journey: Journey;
  viewport: Viewport | null;
  browser: string | null;
  colorScheme: ScreenshotMetadataColorScheme | null;
  screens: JourneyScreen[];
  changedCount: number;
};

type JourneyTest = {
  key: string;
  prefix: string;
  title: string;
  location: Journey["location"];
  /** Smallest viewport first. */
  runs: JourneyRun[];
  changedCount: number;
  /** What tells the runs apart, besides their viewport. */
  showBrowser: boolean;
  showColorScheme: boolean;
};

function getDiffMetadata(diff: JourneyDiff) {
  return (
    diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata ?? null
  );
}

/**
 * The runs of a journey, one per variant. A test takes each screen at several
 * sizes in a single run with Argos's `viewports` option: the sizes are steps
 * of one journey, and each is walked on its own.
 */
function getJourneyRuns(
  journey: Journey,
  context: { isSubsetBuild: boolean },
): JourneyRun[] {
  const signatures = new Set(
    journey.steps.flatMap((step) => step.diffs.map(getVariantSignature)),
  );
  return Array.from(signatures, (signature) => {
    const screens = journey.steps.flatMap((step) => {
      const diff = step.diffs.find(
        (diff) => getVariantSignature(diff) === signature,
      );
      return diff
        ? [
            {
              label: getStepLabel(step.key),
              diff,
              changed: checkDiffNeedsAttention(diff, context),
            },
          ]
        : [];
    });
    const [firstScreen] = screens;
    invariant(firstScreen, "a variant has at least one screen");
    const metadata = getDiffMetadata(firstScreen.diff);
    return {
      key: `${journey.id}${signature}`,
      journey,
      viewport: metadata?.viewport ?? journey.viewport,
      browser: metadata?.browser?.name ?? journey.browser,
      colorScheme: metadata?.colorScheme ?? null,
      screens,
      changedCount: screens.filter((screen) => screen.changed).length,
    };
  });
}

/** The tests of the build, their runs together, the most changed first. */
function getJourneyTests(
  journeys: Journey[],
  context: { isSubsetBuild: boolean },
): JourneyTest[] {
  const runsByTest = new Map<string, JourneyRun[]>();
  for (const journey of journeys) {
    const key = getJourneyTestKey(journey);
    const runs = runsByTest.get(key) ?? [];
    runsByTest.set(key, runs);
    runs.push(...getJourneyRuns(journey, context));
  }
  return Array.from(runsByTest, ([key, runs]): JourneyTest => {
    const [firstRun] = runs;
    invariant(firstRun, "a test has at least one run");
    const { journey } = firstRun;
    return {
      key,
      prefix: journey.prefix,
      title: journey.title,
      location: journey.location,
      runs: runs.toSorted(
        (a, b) =>
          (a.viewport?.width ?? Infinity) - (b.viewport?.width ?? Infinity) ||
          a.key.localeCompare(b.key),
      ),
      changedCount: runs.reduce((count, run) => count + run.changedCount, 0),
      showBrowser: new Set(runs.map((run) => run.browser)).size > 1,
      showColorScheme: new Set(runs.map((run) => run.colorScheme)).size > 1,
    };
  }).sort(
    (a, b) => b.changedCount - a.changedCount || a.key.localeCompare(b.key),
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

type ReviewMarkValue = EvaluationStatus.Accepted | EvaluationStatus.Rejected;

const NO_REVIEW_STATUSES: Record<string, EvaluationStatus> = {};

/** The viewer's marks in the review under way, by diff id. */
function useReviewStatuses() {
  return useBuildReviewState()?.diffStatuses ?? NO_REVIEW_STATUSES;
}

/**
 * Whether the viewer has marked every screen of `diffs` in the review under
 * way, and how: rejected as soon as one is.
 */
function getReviewMark(
  diffs: JourneyDiff[],
  statuses: Record<string, EvaluationStatus>,
): ReviewMarkValue | null {
  if (diffs.length === 0) {
    return null;
  }
  let rejected = false;
  for (const diff of diffs) {
    const status = statuses[diff.id];
    if (status === EvaluationStatus.Rejected) {
      rejected = true;
    } else if (status !== EvaluationStatus.Accepted) {
      return null;
    }
  }
  return rejected ? EvaluationStatus.Rejected : EvaluationStatus.Accepted;
}

function getChangedDiffs(runs: JourneyRun[]): JourneyDiff[] {
  return runs.flatMap((run) =>
    run.screens.filter((screen) => screen.changed).map((screen) => screen.diff),
  );
}

function ReviewMark(props: { mark: ReviewMarkValue; className?: string }) {
  const { icon: Icon } = getDiffGroupDefinition(props.mark);
  const rejected = props.mark === EvaluationStatus.Rejected;
  const description = rejected
    ? "Reviewed, with a rejected screen"
    : "Reviewed, every screen accepted";
  return (
    <Tooltip content={description}>
      <span
        role="img"
        aria-label={description}
        className={clsx(
          "inline-flex shrink-0",
          rejected ? "text-danger-low" : "text-success-low",
          props.className,
        )}
      >
        <Icon className="size-3.5" />
      </span>
    </Tooltip>
  );
}

/**
 * The build's end-to-end tests that walk several screens, each run as a strip
 * of its screens. A run opens the build on its first screen with the journey
 * filter on, a screen opens it on that screen: the review then walks the
 * journey screen by screen, the way a user clicks through the app.
 */
export function JourneysSection(props: {
  build: Build;
  repoUrl: string | null;
}) {
  const { build, repoUrl } = props;
  const [expanded, setExpanded] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  if (build.journeys.length === 0) {
    return null;
  }
  const tests = getJourneyTests(build.journeys, {
    isSubsetBuild: build.subset,
  });
  const changed = tests.filter((test) => test.changedCount > 0);
  const unchanged = tests.filter((test) => test.changedCount === 0);
  // With nothing changed, the unchanged journeys are all there is to walk.
  const listed = showUnchanged || changed.length === 0 ? tests : changed;
  const collapsible = listed.length > COLLAPSED_JOURNEY_COUNT + 1;
  const visible =
    collapsible && !expanded
      ? listed.slice(0, COLLAPSED_JOURNEY_COUNT)
      : listed;
  const hiddenUnchangedCount = listed === changed ? unchanged.length : 0;
  const singleScreenTests = getJourneyTests(build.singleScreenTests, {
    isSubsetBuild: build.subset,
  });
  return (
    <Panel elevation={0} className="pb-1">
      <PanelHeader className="mb-2">
        <PanelTitle icon={WaypointsIcon}>Journeys</PanelTitle>
        <span className="text-low text-xs tabular-nums">
          {plural(tests.length, "journey")}
        </span>
      </PanelHeader>
      <ul>
        {visible.map((test) => (
          <JourneyTestItem
            key={test.key}
            test={test}
            href={getLocationURL({
              location: test.location,
              repoUrl,
              branch: build.branch,
            })}
          />
        ))}
      </ul>
      {(collapsible && !expanded) || hiddenUnchangedCount > 0 ? (
        <div className="border-t-thin flex flex-wrap gap-2 px-2 pt-2.5 pb-2">
          {collapsible && !expanded ? (
            <SectionButton onClick={() => setExpanded(true)}>
              Show {plural(listed.length - visible.length, "more journey")}
            </SectionButton>
          ) : null}
          {hiddenUnchangedCount > 0 ? (
            <SectionButton onClick={() => setShowUnchanged(true)}>
              Show {plural(hiddenUnchangedCount, "unchanged journey")}
            </SectionButton>
          ) : null}
        </div>
      ) : null}
      <SingleScreenTests tests={singleScreenTests} />
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

const MAX_CHANGED_SCREEN_NAMES = 6;

/** A screen of a journey, opened with the journey filter on. */
function getJourneyScreenURL(
  params: BuildParams,
  journey: Journey,
  diff: JourneyDiff,
): string {
  return serializeJourneySearch(getBuildURL({ ...params, diffId: diff.id }), {
    journey: new Set([journey.id]),
  });
}

type NamedScreen = JourneyScreen & { index: number; journey: Journey };

/**
 * The screens that changed in any run of a test, once each, in journey order:
 * the runs of a test take the same screens, at another viewport.
 */
function getChangedScreens(test: JourneyTest): NamedScreen[] {
  const byLabel = new Map<string, NamedScreen>();
  for (const run of test.runs) {
    run.screens.forEach((screen, index) => {
      if (screen.changed && !byLabel.has(screen.label)) {
        byLabel.set(screen.label, { ...screen, index, journey: run.journey });
      }
    });
  }
  return Array.from(byLabel.values()).sort((a, b) => a.index - b.index);
}

function JourneyTestItem(props: { test: JourneyTest; href: string | null }) {
  const { test, href } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const mark = getReviewMark(getChangedDiffs(test.runs), useReviewStatuses());
  const changedScreens = getChangedScreens(test);
  const namedScreens = changedScreens.slice(0, MAX_CHANGED_SCREEN_NAMES);
  return (
    <li className="border-t-thin px-4 pt-3 pb-2.5 first:border-t-0 first:pt-1">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {test.prefix ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-low hover:text-default inline-flex max-w-full items-center gap-1 text-xs transition"
              >
                <FileCodeIcon className="size-3.5 shrink-0" />
                <span className="truncate">{test.prefix}</span>
              </a>
            ) : (
              <div className="text-low truncate text-xs">{test.prefix}</div>
            )
          ) : null}
          <h3 className="mt-0.5 text-sm/snug font-medium">
            {test.title}
            {mark ? (
              <ReviewMark mark={mark} className="ml-1.5 align-[-0.125em]" />
            ) : null}
          </h3>
          {namedScreens.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {namedScreens.map((screen) => (
                <HeadlessLink
                  key={screen.label}
                  href={getJourneyScreenURL(
                    params,
                    screen.journey,
                    screen.diff,
                  )}
                  aria-label={`Screen ${screen.index + 1}, ${screen.label}, changed`}
                  className="border-thin bg-app hover:bg-hover focus-ring text-xxs max-w-full truncate rounded-full px-1.5 transition"
                >
                  {screen.label}
                </HeadlessLink>
              ))}
              {changedScreens.length > namedScreens.length ? (
                <span className="text-low text-xxs px-0.5 tabular-nums">
                  +{changedScreens.length - namedScreens.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {/* Runs side by side as long as each keeps its text beside its
          screens. */}
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-3">
        {test.runs.map((run) => (
          <JourneyRunItem key={run.key} run={run} test={test} />
        ))}
      </ul>
    </li>
  );
}

/**
 * The first screen of a run as it showed, at twice the size the card draws
 * it: the top of a full-page capture, one viewport tall.
 */
function getFirstScreenTransformations(viewport: Viewport | null): string[] {
  const ratio = viewport ? viewport.width / viewport.height : 1.5;
  return ["w-400", `h-${Math.round(400 / ratio)}`, "fo-top", "e-sharpen"];
}

function getRunLabel(run: JourneyRun, test: JourneyTest): string {
  return [
    run.viewport ? formatViewport(run.viewport) : null,
    test.showColorScheme && run.colorScheme
      ? capitalize(run.colorScheme)
      : null,
    test.showBrowser && run.browser ? getBrowserLabel(run.browser) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function JourneyRunItem(props: { run: JourneyRun; test: JourneyTest }) {
  const { run, test } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const { journey, screens, changedCount, viewport, browser } = run;
  const [firstScreen] = screens;
  invariant(firstScreen, "a journey has at least one screen");
  const ViewportIcon = viewport
    ? viewportIcons[getViewportIconKind(viewport.width)]
    : null;
  const label = getRunLabel(run, test);
  // The first screen that changed, the walk shows the rest. A run that
  // changed nothing shows how it starts.
  const changed = screens.filter((screen) => screen.changed);
  const [shownScreen = firstScreen] = changed;
  const mark = getReviewMark(
    changed.map((screen) => screen.diff),
    useReviewStatuses(),
  );
  return (
    <li className="bg-ui hover:bg-hover relative flex items-center gap-4 rounded-lg px-4 py-3.5 transition">
      {mark ? (
        <ReviewMark mark={mark} className="absolute top-2.5 right-2.5 z-1" />
      ) : null}
      {/* Half the card, at the viewport's shape: a phone screen, too tall
          for that, shows its top. */}
      <span
        className="block max-h-44 w-1/2 shrink-0 overflow-hidden rounded-sm shadow-md"
        style={{
          aspectRatio: viewport
            ? `${viewport.width} / ${viewport.height}`
            : "3 / 2",
        }}
      >
        <ScreenshotDiffThumbnail
          screenshotDiff={shownScreen.diff}
          className="size-full"
          iconClassName="m-auto size-6"
          fit="cover-top"
          transformations={getFirstScreenTransformations(viewport)}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="text-low flex min-w-0 items-center gap-1.5 text-xs tabular-nums">
          {test.showBrowser && browser ? (
            <BrowserIcon
              browser={{ name: browser }}
              className="size-3.5 shrink-0"
            />
          ) : null}
          {ViewportIcon ? <ViewportIcon className="size-3.5 shrink-0" /> : null}
          <span className="truncate">{label || "Run"}</span>
        </span>
        <span
          className={clsx(
            "text-[0.8125rem]/5 font-medium",
            changedCount > 0 ? "text-warning-low" : "text-low",
          )}
        >
          {changedCount > 0
            ? `${changedCount} of ${screens.length} changed`
            : plural(screens.length, "screen")}
        </span>
        {/* The whole block walks the journey from its start. */}
        <HeadlessLink
          href={getJourneyScreenURL(params, journey, firstScreen.diff)}
          aria-label={`Walk “${test.title}”${label ? ` at ${label}` : ""}`}
          className="text-primary-low mt-0.5 inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-(--ring-color-default)"
        >
          Walk the journey
          <ArrowRightIcon className="size-3.5" />
        </HeadlessLink>
      </div>
    </li>
  );
}

const COLLAPSED_SINGLE_SCREEN_COUNT = 5;

/**
 * The changed tests that capture a single screen, a line each after the
 * journeys: nothing to walk, but the section then covers every changed test.
 */
function SingleScreenTests(props: { tests: JourneyTest[] }) {
  const { tests } = props;
  const [expanded, setExpanded] = useState(false);
  if (tests.length === 0) {
    return null;
  }
  const collapsible = tests.length > COLLAPSED_SINGLE_SCREEN_COUNT + 1;
  const visible =
    collapsible && !expanded
      ? tests.slice(0, COLLAPSED_SINGLE_SCREEN_COUNT)
      : tests;
  return (
    <div className="border-t-thin px-4 pt-3 pb-1.5">
      <h3 className="text-low text-xs font-medium">Single-screen tests</h3>
      <ul className="mt-1.5 flex flex-col">
        {visible.map((test) => (
          <SingleScreenTestItem key={test.key} test={test} />
        ))}
      </ul>
      {collapsible && !expanded ? (
        <div className="-mx-2 mt-1">
          <SectionButton onClick={() => setExpanded(true)}>
            Show {plural(tests.length - visible.length, "more test")}
          </SectionButton>
        </div>
      ) : null}
    </div>
  );
}

function SingleScreenTestItem(props: { test: JourneyTest }) {
  const { test } = props;
  const params = useBuildParams();
  invariant(params, "a test is rendered on a build page");
  const mark = getReviewMark(getChangedDiffs(test.runs), useReviewStatuses());
  const shownRun =
    test.runs.find((run) => run.changedCount > 0) ?? test.runs[0];
  const shownScreen = shownRun?.screens[0];
  invariant(shownScreen, "a test has at least one screen");
  const ratio = shownRun?.viewport
    ? shownRun.viewport.width / shownRun.viewport.height
    : 1.5;
  const thumbnail = { width: Math.round(40 * ratio), height: 40 };
  return (
    <li className="hover:bg-subtle relative -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition">
      <span className="block shrink-0" style={thumbnail}>
        <ScreenshotDiffThumbnail
          screenshotDiff={shownScreen.diff}
          className="size-full"
          iconClassName="m-auto size-4"
          fit="cover"
          transformations={[
            `w-${thumbnail.width * 2}`,
            `h-${thumbnail.height * 2}`,
            "fo-top",
            "e-sharpen",
          ]}
        />
      </span>
      <div className="min-w-0 flex-1">
        {test.prefix ? (
          <div className="text-low truncate text-xs">{test.prefix}</div>
        ) : null}
        {/* The whole line opens the screen that changed. */}
        <HeadlessLink
          href={getBuildURL({ ...params, diffId: shownScreen.diff.id })}
          className="text-sm/snug font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-(--ring-color-default)"
        >
          {test.title}
        </HeadlessLink>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {test.runs.map((run) => {
          const [screen] = run.screens;
          invariant(screen, "a run has at least one screen");
          const ViewportIcon = run.viewport
            ? viewportIcons[getViewportIconKind(run.viewport.width)]
            : null;
          return (
            <HeadlessLink
              key={run.key}
              href={getBuildURL({ ...params, diffId: screen.diff.id })}
              className={clsx(
                "border-thin bg-app hover:bg-hover focus-ring text-xxs relative z-1 flex items-center gap-1 rounded-full px-1.5 tabular-nums transition",
                run.changedCount > 0 ? "text-warning-low" : "text-low",
              )}
            >
              {ViewportIcon ? <ViewportIcon className="size-3" /> : null}
              {getRunLabel(run, test) || "Run"}
            </HeadlessLink>
          );
        })}
        {mark ? <ReviewMark mark={mark} className="relative z-1 ml-1" /> : null}
      </div>
    </li>
  );
}
