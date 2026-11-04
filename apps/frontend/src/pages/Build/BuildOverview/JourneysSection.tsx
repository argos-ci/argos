import { useEffect, useId, useRef, useState } from "react";
import { getStepLabel, getVariantSignature } from "@argos/schemas/journey";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronRightIcon, FileCodeIcon, WaypointsIcon } from "lucide-react";
import { useLocation } from "react-router";

import {
  getDiffGroupDefinition,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import { DiffCard } from "@/containers/Build/BuildDiffListPrimitives";
import { DocumentType, graphql } from "@/gql";
import {
  BuildType,
  ScreenshotDiffStatus,
  type ScreenshotMetadataColorScheme,
} from "@/gql/graphql";
import { Details } from "@/ui/Details";
import { HeadlessLink } from "@/ui/Link";
import { getSurfaceClassName } from "@/ui/Panel";
import { Tooltip } from "@/ui/Tooltip";
import { buildTypeDescriptors } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";
import { capitalize } from "@/util/string";

import { checkDiffNeedsAttention } from "../BuildJourneyDrawer";
import { getBuildURL, useBuildParams, type BuildParams } from "../BuildParams";
import { getBuildReviewBlocker } from "../BuildReviewability";
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
import {
  getRepositoryFileURL,
  getRepositoryPath,
} from "../sidebar/metadata/LocationChip";
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
    ...BuildReviewability_Build
    journeys {
      ...JourneysSection_Journey
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Journey = DocumentType<typeof _JourneyFragment>;
type JourneyDiff = Journey["steps"][number]["diffs"][number];

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

/** An icon that says what it means on hover, for whoever does not know it. */
function ExplainedIcon(props: {
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={props.description}>
      <span
        role="img"
        aria-label={props.description}
        className={clsx("inline-flex shrink-0", props.className)}
      >
        {props.children}
      </span>
    </Tooltip>
  );
}

/**
 * Where a run or a test stands, with the snapshot list's status icons and
 * colors: changed until every change is reviewed, then accepted or rejected.
 */
function StatusMark(props: {
  group: DiffGroupName;
  description: string;
  className?: string;
}) {
  const { icon: Icon, color } = getDiffGroupDefinition(props.group);
  return (
    <ExplainedIcon
      description={props.description}
      className={clsx(lowTextColorClassNames[color], props.className)}
    >
      <Icon className="size-3.5" />
    </ExplainedIcon>
  );
}

/** A change the build approved itself, as it ran on an auto-approved branch. */
function AutoApprovedMark() {
  const { icon: Icon, color } = buildTypeDescriptors[BuildType.Reference];
  return (
    <ExplainedIcon
      description="Changed, auto-approved with the build"
      className={lowTextColorClassNames[color]}
    >
      <Icon className="size-3.5" />
    </ExplainedIcon>
  );
}

type ReviewBlocker = ReturnType<typeof getBuildReviewBlocker>;

function ReviewMark(props: { mark: ReviewMarkValue; className?: string }) {
  return (
    <StatusMark
      group={props.mark}
      description={
        props.mark === EvaluationStatus.Rejected
          ? "Reviewed, with a rejected screen"
          : "Reviewed, every screen accepted"
      }
      className={props.className}
    />
  );
}

/** The overview anchor of a journey, where walking it leads back to. */
export function getJourneyAnchor(journeyId: string): string {
  return `journey-${journeyId}`;
}

/**
 * The build's end-to-end tests that walk several screens, by file, each run
 * as a card. A run opens the build on its first screen with the journey
 * filter on, a screen opens it on that screen: the review then walks the
 * journey screen by screen, the way a user clicks through the app.
 *
 * A section of the page rather than a panel among others: when a build has
 * journeys, they are what its review goes through.
 */
export function JourneysSection(props: {
  build: Build;
  repoUrl: string | null;
}) {
  const { build, repoUrl } = props;
  const { hash } = useLocation();
  const headingId = useId();
  const tests = getJourneyTests(build.journeys, {
    isSubsetBuild: build.subset,
  });
  const checkIsWalked = (test: JourneyTest) =>
    test.runs.some((run) => `#${getJourneyAnchor(run.journey.id)}` === hash);
  const changed = tests.filter((test) => test.changedCount > 0);
  const unchanged = tests.filter((test) => test.changedCount === 0);
  // Open with nothing else to walk, or back from an unchanged journey.
  const [showUnchanged, setShowUnchanged] = useState(
    () => changed.length === 0 || unchanged.some(checkIsWalked),
  );
  if (tests.length === 0) {
    return null;
  }
  const fileContext = { repoUrl, branch: build.branch };
  const listProps = {
    checkIsWalked,
    reviewBlocker: getBuildReviewBlocker(build),
  };
  return (
    <>
      {changed.length > 0 ? (
        <section aria-labelledby={headingId} className="flex flex-col">
          <h2
            id={headingId}
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <WaypointsIcon
              className="text-primary-low size-5 shrink-0"
              strokeWidth={1.75}
            />
            Journeys
          </h2>
          <p className="text-low mt-0.5 text-sm">
            Tests that walk several screens. Open one to review its screens in
            order.
          </p>
          <JourneyFileList
            files={groupByFile(changed, fileContext)}
            className="mt-4"
            {...listProps}
          />
        </section>
      ) : null}
      {/* Nothing there needs a look: folded, under a heading that says it
          opens. */}
      {unchanged.length > 0 ? (
        <Details
          open={showUnchanged}
          onToggle={(event) => setShowUnchanged(event.currentTarget.open)}
        >
          <summary className="focus-ring text-low hover:text-default flex cursor-default list-none items-center gap-1.5 rounded-md transition">
            <ChevronRightIcon className="size-4.5 shrink-0 transition [details[open]>summary_&]:rotate-90" />
            <h2 className="text-lg font-semibold tracking-tight">
              Unchanged journeys
            </h2>
            <span className="ml-auto text-sm tabular-nums">
              {plural(unchanged.length, "journey")}
            </span>
          </summary>
          {showUnchanged ? (
            <JourneyFileList
              files={groupByFile(unchanged, fileContext)}
              className="mt-4"
              {...listProps}
            />
          ) : null}
        </Details>
      ) : null}
    </>
  );
}

type JourneyFile = {
  key: string;
  /** The file name, or the title path when the test has no location. */
  name: string;
  /** Where the file sits in the repository, when it says more than its name. */
  path: string | null;
  href: string | null;
  tests: JourneyTest[];
};

/**
 * `tests` by the file that holds them, the files in the order their first
 * test comes in: the most changed first, as `tests` is sorted.
 */
function groupByFile(
  tests: JourneyTest[],
  context: { repoUrl: string | null; branch: string | null },
): JourneyFile[] {
  const files = new Map<string, JourneyFile>();
  for (const test of tests) {
    const path = test.location ? getRepositoryPath(test.location.file) : null;
    const key = path ?? test.prefix;
    const file = files.get(key) ?? {
      key,
      name: path ? path.split("/").pop() || path : test.prefix,
      path: path?.includes("/") ? path : null,
      href: path ? getRepositoryFileURL({ file: path, ...context }) : null,
      tests: [],
    };
    files.set(key, file);
    file.tests.push(test);
  }
  return Array.from(files.values());
}

/**
 * What the title path says about a test besides its file: `describe` blocks,
 * a Playwright project. Cypress leaves the file out of it, Playwright puts it
 * in, relative to its test directory.
 */
function getTestContext(test: JourneyTest, file: JourneyFile): string | null {
  if (!test.location) {
    // The file is named after the title path itself.
    return null;
  }
  const filePath = file.path ?? file.name;
  const context = test.prefix
    .split(" › ")
    .filter((segment) => segment && !filePath.endsWith(segment));
  return context.length > 0 ? context.join(" › ") : null;
}

function checkNeedsReview(
  test: JourneyTest,
  statuses: Record<string, EvaluationStatus>,
): boolean {
  const diffs = getChangedDiffs(test.runs);
  return diffs.length > 0 && getReviewMark(diffs, statuses) === null;
}

function JourneyFileList(props: {
  files: JourneyFile[];
  checkIsWalked: (test: JourneyTest) => boolean;
  reviewBlocker: ReviewBlocker;
  className?: string;
}) {
  const { files, ...itemProps } = props;
  return (
    <ul className={clsx("flex flex-col gap-6", props.className)}>
      {files.map((file) => (
        <JourneyFileCard key={file.key} file={file} {...itemProps} />
      ))}
    </ul>
  );
}

/** A test file and its journeys, as a pull request review shows a file. */
function JourneyFileCard(props: {
  file: JourneyFile;
  checkIsWalked: (test: JourneyTest) => boolean;
  reviewBlocker: ReviewBlocker;
}) {
  const { file, checkIsWalked, reviewBlocker } = props;
  const statuses = useReviewStatuses();
  const toReviewCount = reviewBlocker
    ? 0
    : file.tests.filter((test) => checkNeedsReview(test, statuses)).length;
  const fileLabel = (
    <>
      <span className="shrink-0 text-sm font-medium">{file.name}</span>{" "}
      {file.path ? (
        <span className="text-low truncate text-xs">{file.path}</span>
      ) : null}
    </>
  );
  return (
    <li className={getSurfaceClassName({ elevation: 0 })}>
      {/* Stuck to the top while its journeys scroll by, so a long file keeps
          saying which one it is. */}
      <div className="bg-app border-b-thin sticky top-0 z-10 flex h-11 items-center gap-2 rounded-t-xl px-4">
        <FileCodeIcon className="text-low size-4 shrink-0" />
        <h3 className="flex min-w-0">
          {file.href ? (
            <a
              href={file.href}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex min-w-0 items-baseline gap-2 rounded-xs hover:underline"
            >
              {fileLabel}
            </a>
          ) : (
            <span className="flex min-w-0 items-baseline gap-2">
              {fileLabel}
            </span>
          )}
        </h3>
        {toReviewCount > 0 ? (
          <span className="text-low ml-auto shrink-0 text-xs tabular-nums">
            {toReviewCount} to review
          </span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-8 px-4 pt-4 pb-5">
        {file.tests.map((test) => (
          <JourneyTestItem
            key={test.key}
            test={test}
            context={getTestContext(test, file)}
            scrollIntoView={checkIsWalked(test)}
            reviewBlocker={reviewBlocker}
          />
        ))}
      </ul>
    </li>
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

function JourneyTestItem(props: {
  test: JourneyTest;
  /** What the title path says besides the file, shown before the title. */
  context: string | null;
  /** Whether the review comes back from walking it, to show it first. */
  scrollIntoView: boolean;
  reviewBlocker: ReviewBlocker;
}) {
  const { test, context, scrollIntoView, reviewBlocker } = props;
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (scrollIntoView) {
      ref.current?.scrollIntoView({ block: "center" });
    }
  }, [scrollIntoView]);
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const mark = getReviewMark(getChangedDiffs(test.runs), useReviewStatuses());
  const changedScreens = getChangedScreens(test);
  const namedScreens = changedScreens.slice(0, MAX_CHANGED_SCREEN_NAMES);
  return (
    <li ref={ref}>
      <h4 className="text-sm/snug font-medium">
        {context ? <span className="text-low">{context} › </span> : null}
        {test.title}
        {mark ? (
          <ReviewMark mark={mark} className="ml-1.5 align-[-0.125em]" />
        ) : null}
      </h4>
      {namedScreens.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {namedScreens.map((screen) => (
            <HeadlessLink
              key={screen.label}
              href={getJourneyScreenURL(params, screen.journey, screen.diff)}
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
      <JourneyLineup test={test} reviewBlocker={reviewBlocker} />
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
function JourneyLineup(props: {
  test: JourneyTest;
  reviewBlocker: ReviewBlocker;
}) {
  const { test, reviewBlocker } = props;
  return (
    <ul className="mt-3 grid gap-4 sm:grid-cols-2">
      {test.runs.map((run) => (
        <JourneyRunItem
          key={run.key}
          run={run}
          test={test}
          reviewBlocker={reviewBlocker}
        />
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

function JourneyRunItem(props: {
  run: JourneyRun;
  test: JourneyTest;
  reviewBlocker: ReviewBlocker;
}) {
  const { run, test, reviewBlocker } = props;
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
  const reviewStatuses = useReviewStatuses();
  const mark = getReviewMark(
    changed.map((screen) => screen.diff),
    reviewStatuses,
  );
  const reviewedCount = changed.filter((screen) => {
    const status = reviewStatuses[screen.diff.id];
    return (
      status === EvaluationStatus.Accepted ||
      status === EvaluationStatus.Rejected
    );
  }).length;
  const ViewportIcon = viewport
    ? viewportIcons[getViewportIconKind(viewport.width)]
    : null;
  const screenWidth = getScreenWidthPercent(viewport);
  const narrow = screenWidth < 100;
  const ColorSchemeIcon =
    test.showColorScheme && colorScheme ? colorSchemeIcons[colorScheme] : null;
  return (
    <li>
      {/* The whole card walks the journey from its start. */}
      <HeadlessLink
        href={getJourneyScreenURL(params, journey, firstScreen.diff)}
        aria-label={`Walk “${test.title}”${label ? ` at ${label}` : ""}`}
        className="group/item block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--ring-color-default)"
      >
        <DiffCard
          isActive={false}
          variant={
            changed.length > 0 && !reviewBlocker
              ? getDiffCardVariant(mark)
              : "neutral"
          }
        >
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
                loading="lazy"
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
                {changed.length === 0 ? (
                  <StatusMark
                    group={ScreenshotDiffStatus.Unchanged}
                    description="No changes in this journey"
                  />
                ) : reviewBlocker === "reference" ? (
                  <AutoApprovedMark />
                ) : reviewBlocker === "merge-queue" ? (
                  <StatusMark
                    group={ScreenshotDiffStatus.Changed}
                    description="Changed, in a merge queue build"
                  />
                ) : mark ? (
                  <ReviewMark mark={mark} />
                ) : (
                  <StatusMark
                    group={ScreenshotDiffStatus.Changed}
                    description={
                      reviewedCount === 0
                        ? "Changed, not reviewed yet"
                        : `Changed, ${reviewedCount} of ${changed.length} reviewed`
                    }
                  />
                )}
                <ExplainedIcon
                  description={`A journey of ${plural(screens.length, "screen")}`}
                >
                  <WaypointsIcon className="size-3.5" />
                </ExplainedIcon>
              </span>
            </div>
          </div>
        </DiffCard>
      </HeadlessLink>
    </li>
  );
}
