import { useState } from "react";
import { getStepLabel, getVariantSignature } from "@argos/schemas/journey";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { FileCodeIcon, WaypointsIcon } from "lucide-react";

import { getDiffGroupDefinition } from "@/containers/Build/BuildDiffGroup";
import { DiffCard } from "@/containers/Build/BuildDiffListPrimitives";
import { DocumentType, graphql } from "@/gql";
import type { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { Button } from "@/ui/Button";
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
import {
  colorSchemeIcons,
  getViewportIconKind,
  viewportIcons,
} from "../metadata/metadataIcons";
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
  const changed = groupByPrefix(tests.filter((test) => test.changedCount > 0));
  const unchanged = groupByPrefix(
    tests.filter((test) => test.changedCount === 0),
  );
  // With nothing changed, the unchanged journeys are all there is to walk.
  const listed =
    showUnchanged || changed.length === 0
      ? [...changed, ...unchanged]
      : changed;
  const collapsible = listed.length > COLLAPSED_JOURNEY_COUNT + 1;
  const visible =
    collapsible && !expanded
      ? listed.slice(0, COLLAPSED_JOURNEY_COUNT)
      : listed;
  const hiddenUnchangedCount = listed === changed ? unchanged.length : 0;
  return (
    <Panel elevation={0} className="pb-4">
      <PanelHeader className="mb-2">
        <PanelTitle icon={WaypointsIcon}>Journeys</PanelTitle>
        <span className="text-low text-xs tabular-nums">
          {plural(tests.length, "journey")}
        </span>
      </PanelHeader>
      {/* A rule only between files: within one, a title sits close to its
          cards and far from the ones above, and the file opens its group. */}
      <ul className="flex flex-col gap-8">
        {visible.map((test, index) => {
          const opensGroup =
            index === 0 || visible[index - 1]?.prefix !== test.prefix;
          return (
            <JourneyTestItem
              key={test.key}
              test={test}
              showPrefix={opensGroup}
              className={clsx(opensGroup && index > 0 && "border-t-thin pt-6")}
              href={getLocationURL({
                location: test.location,
                repoUrl,
                branch: build.branch,
              })}
            />
          );
        })}
      </ul>
      {(collapsible && !expanded) || hiddenUnchangedCount > 0 ? (
        <div className="flex flex-wrap gap-2 px-4 pt-8">
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
    </Panel>
  );
}

function SectionButton(props: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="secondary" size="small" onClick={props.onClick}>
      {props.children}
    </Button>
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

/**
 * `tests` grouped by file and describe blocks, the groups in the order their
 * first test comes in, so the most changed first as `tests` is sorted.
 */
function groupByPrefix(tests: JourneyTest[]): JourneyTest[] {
  const groups = new Map<string, JourneyTest[]>();
  for (const test of tests) {
    const group = groups.get(test.prefix) ?? [];
    groups.set(test.prefix, group);
    group.push(test);
  }
  return Array.from(groups.values()).flat();
}

function JourneyTestItem(props: {
  test: JourneyTest;
  href: string | null;
  /** Whether the test opens a group of the same file, which names it. */
  showPrefix: boolean;
  className?: string;
}) {
  const { test, href, showPrefix } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const mark = getReviewMark(getChangedDiffs(test.runs), useReviewStatuses());
  const changedScreens = getChangedScreens(test);
  const namedScreens = changedScreens.slice(0, MAX_CHANGED_SCREEN_NAMES);
  return (
    <li className={clsx("px-4", props.className)}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {test.prefix && showPrefix ? (
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
          <h3
            className={clsx(
              "text-sm/snug font-medium",
              test.prefix && showPrefix && "mt-3",
            )}
          >
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
      <JourneyLineup test={test} />
    </li>
  );
}

/**
 * The first screen of a run as it showed, at twice the width the card draws
 * it: the top of a full-page capture, one viewport tall.
 */
function getFirstScreenTransformations(
  viewport: Viewport | null,
  width: number,
): string[] {
  const ratio = viewport ? viewport.width / viewport.height : 1.5;
  return [
    `w-${width}`,
    `h-${Math.round(width / ratio)}`,
    "fo-top",
    "e-sharpen",
  ];
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

/**
 * The runs of a test side by side, half a row each, as cards like the ones
 * in the build's snapshot list.
 */
function JourneyLineup(props: { test: JourneyTest }) {
  const { test } = props;
  return (
    <ul className="mt-3 grid gap-4 sm:grid-cols-2">
      {test.runs.map((run) => (
        <JourneyRunItem key={run.key} run={run} test={test} />
      ))}
    </ul>
  );
}

/** A card's image area: a screen as wide shows its whole first screen. */
const IMAGE_AREA_RATIO = 16 / 9;

/**
 * How much of its first screen a card shows, at least. A screen narrower
 * than that ratio stands in the middle of the card, as wide as it takes, so
 * the room around it tells a phone from a tablet from a desktop.
 */
const SHOWN_SCREEN_SHARE = 0.6;

/** A screen's width in its card, in percent. */
function getScreenWidthPercent(viewport: Viewport | null): number {
  const ratio = viewport ? viewport.width / viewport.height : 1.5;
  return Math.min(
    100,
    Math.round((ratio / IMAGE_AREA_RATIO / SHOWN_SCREEN_SHARE) * 100),
  );
}

function getDiffCardVariant(mark: ReviewMarkValue | null) {
  switch (mark) {
    case EvaluationStatus.Accepted:
      return "success" as const;
    case EvaluationStatus.Rejected:
      return "danger" as const;
    case null:
      return "primary" as const;
    default:
      assertNever(mark);
  }
}

function JourneyRunItem(props: { run: JourneyRun; test: JourneyTest }) {
  const { run, test } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const { journey, screens, viewport, browser, colorScheme } = run;
  const [firstScreen] = screens;
  invariant(firstScreen, "a journey has at least one screen");
  const label = getRunLabel(run, test);
  // The first screen that changed, the walk shows the rest. A run that
  // changed nothing shows how it starts.
  const changed = screens.filter((screen) => screen.changed);
  const [shownScreen = firstScreen] = changed;
  const mark = getReviewMark(
    changed.map((screen) => screen.diff),
    useReviewStatuses(),
  );
  const ViewportIcon = viewport
    ? viewportIcons[getViewportIconKind(viewport.width)]
    : null;
  const screenWidth = getScreenWidthPercent(viewport);
  const narrow = screenWidth < 100;
  const ColorSchemeIcon =
    test.showColorScheme && colorScheme ? colorSchemeIcons[colorScheme] : null;
  return (
    <li className="group/item relative isolate">
      {/* A journey is a stack of screens: a card peeks out behind, like
          similar snapshots in the list. */}
      <div className="bg-hover absolute inset-0 -z-10 translate-x-1.5 translate-y-1.5 rounded-lg border" />
      <DiffCard isActive={false} variant={getDiffCardVariant(mark)}>
        <div className="flex size-full flex-col">
          <div
            className={clsx(
              "aspect-video overflow-hidden",
              narrow && "bg-subtle pt-3",
            )}
          >
            <ScreenshotDiffThumbnail
              screenshotDiff={shownScreen.diff}
              className={clsx(
                "mx-auto h-full",
                narrow
                  ? "rounded-t-md border-b-0 shadow-sm"
                  : "rounded-none border-0",
              )}
              style={{ width: `${screenWidth}%` }}
              iconClassName="m-auto size-6"
              fit="cover-top"
              transformations={getFirstScreenTransformations(
                viewport,
                Math.max(200, Math.round(7.6 * screenWidth)),
              )}
            />
          </div>
          <div className="text-low text-xxs flex items-center gap-1.5 px-2.5 pt-1.5 pb-2 font-medium tabular-nums">
            {ViewportIcon ? (
              <ViewportIcon className="size-3.5 shrink-0" />
            ) : null}
            <span className="truncate">
              {viewport ? formatViewport(viewport) : "Unknown viewport"}
            </span>
            {browser ? (
              <>
                <span aria-hidden>·</span>
                <BrowserIcon
                  browser={{ name: browser }}
                  className="size-3.5 shrink-0"
                />
                <span className="truncate">{getBrowserLabel(browser)}</span>
              </>
            ) : null}
            {ColorSchemeIcon && colorScheme ? (
              <>
                <span aria-hidden>·</span>
                <ColorSchemeIcon className="size-3.5 shrink-0" />
                <span className="truncate">{capitalize(colorScheme)}</span>
              </>
            ) : null}
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {mark ? <ReviewMark mark={mark} /> : null}
              <WaypointsIcon className="size-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </DiffCard>
      {/* The whole card walks the journey from its start. */}
      <HeadlessLink
        href={getJourneyScreenURL(params, journey, firstScreen.diff)}
        aria-label={`Walk “${test.title}”${label ? ` at ${label}` : ""}`}
        className="absolute inset-0 z-30 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--ring-color-default)"
      />
    </li>
  );
}
