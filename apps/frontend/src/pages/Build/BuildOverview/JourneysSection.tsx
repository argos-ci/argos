import { use, useEffect, useId, useMemo, useRef, useState } from "react";
import { getStepLabel } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronDownIcon, FileCodeIcon, WaypointsIcon } from "lucide-react";

import {
  DiffStatusIcon,
  getDiffGroupDefinition,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import {
  DiffCard,
  getReviewDiffCardVariant,
} from "@/containers/Build/BuildDiffListPrimitives";
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

import { getBuildURL, useBuildParams, type BuildParams } from "../BuildParams";
import { getBuildReviewBlocker } from "../BuildReviewability";
import { EvaluationStatus } from "../EvaluationStatus";
import type { JourneyFile, JourneyTestGroups } from "../journey-order";
import {
  getJourneyStatus,
  getJourneyTestFiles,
  getTestContext,
  JOURNEY_STATUS_LABELS,
  useReviewStatuses,
  type ListedJourneyTest,
} from "../journey-tests";
import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../metadata/browser/browserLabels";
import { FilterStateContext } from "../metadata/filters/FilterState";
import {
  FilterCategory,
  getFilterKey,
  withFilters,
} from "../metadata/filters/util";
import {
  colorSchemeIcons,
  getViewportIconKind,
  viewportIcons,
} from "../metadata/metadataIcons";
import { formatViewport } from "../metadata/viewports/util";
import { ReviewProgressBadge } from "../ReviewProgressBadge";
import { getRepositoryFileURL } from "../sidebar/metadata/LocationChip";
import { ScreenshotDiffThumbnail } from "../sidebar/ScreenshotDiffThumbnail";

const _JourneyFragment = graphql(`
  fragment JourneysSection_Journey on BuildJourney {
    id
    prefix
    title
    location {
      file
    }
    stepKeys
    variants {
      browser
      colorScheme
      viewport {
        width
        height
      }
      diffIds
      changedDiffIds
      cover {
        id
        ...ScreenshotDiffThumbnail_ScreenshotDiff
      }
    }
  }
`);

const _BuildFragment = graphql(`
  fragment JourneysSection_Build on Build {
    branch
    ...BuildReviewability_Build
    journeys {
      ...JourneysSection_Journey
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Journey = DocumentType<typeof _JourneyFragment>;
type JourneyCover = Journey["variants"][number]["cover"];

type Viewport = { width: number; height: number };

type JourneyScreen = {
  /** The step's key, its screenshot name without the variant. */
  key: string;
  label: string;
  /** Where the step comes in the journey, from 0. */
  stepIndex: number;
  /** The step's screenshot in the variant the run shows. */
  diffId: string;
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
  changedDiffIds: string[];
  /** The screen its card shows: the first that changed, or the first. */
  cover: JourneyCover;
};

type JourneyTest = Omit<ListedJourneyTest<Journey>, "journeys"> & {
  /** Smallest viewport first. */
  runs: JourneyRun[];
  /** What tells the runs apart. */
  showViewport: boolean;
  showBrowser: boolean;
  showColorScheme: boolean;
};

/**
 * The runs of a journey, one per variant. A test takes each screen at several
 * sizes in a single run with Argos's `viewports` option: the sizes are steps
 * of one journey, and each opens the list on its own.
 */
function getJourneyRuns(journey: Journey): JourneyRun[] {
  return journey.variants.map((variant, variantIndex) => {
    const changed = new Set(variant.changedDiffIds);
    const screens = variant.diffIds.flatMap(
      (diffId, stepIndex): JourneyScreen[] => {
        const key = journey.stepKeys[stepIndex];
        invariant(key, "a variant has a screenshot per step at most");
        return diffId
          ? [
              {
                key,
                label: getStepLabel(key),
                stepIndex,
                diffId,
                changed: changed.has(diffId),
              },
            ]
          : [];
      },
    );
    return {
      key: `${journey.id}:${variantIndex}`,
      journey,
      viewport: variant.viewport,
      browser: variant.browser,
      colorScheme: variant.colorScheme,
      screens,
      changedDiffIds: variant.changedDiffIds,
      cover: variant.cover,
    };
  });
}

/** The tests in the review's order, each run of a test as a card. */
function getJourneyTestGroups(
  journeys: Journey[],
  statuses: Record<string, EvaluationStatus>,
): JourneyTestGroups<JourneyTest> {
  const files = getJourneyTestFiles(journeys, statuses);
  const toTest = ({
    journeys,
    ...test
  }: ListedJourneyTest<Journey>): JourneyTest => {
    const runs = journeys
      .flatMap(getJourneyRuns)
      .toSorted(
        (a, b) =>
          (a.viewport?.width ?? Infinity) - (b.viewport?.width ?? Infinity) ||
          a.key.localeCompare(b.key),
      );
    return {
      ...test,
      runs,
      showViewport:
        new Set(
          runs.map((run) =>
            run.viewport ? formatViewport(run.viewport) : null,
          ),
        ).size > 1,
      showBrowser: new Set(runs.map((run) => run.browser)).size > 1,
      showColorScheme: new Set(runs.map((run) => run.colorScheme)).size > 1,
    };
  };
  const toFile = (file: JourneyFile<ListedJourneyTest<Journey>>) => ({
    ...file,
    tests: file.tests.map(toTest),
  });
  return {
    changed: files.changed.map(toFile),
    unchanged: files.unchanged.map(toFile),
  };
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

type ReviewMarkValue = EvaluationStatus.Accepted | EvaluationStatus.Rejected;

/**
 * Whether the viewer has marked every screen of `diffIds` in the review
 * under way, and how: rejected as soon as one is.
 */
function getReviewMark(
  diffIds: string[],
  statuses: Record<string, EvaluationStatus>,
): ReviewMarkValue | null {
  const status = getJourneyStatus(diffIds, statuses);
  return status === EvaluationStatus.Accepted ||
    status === EvaluationStatus.Rejected
    ? status
    : null;
}

function getChangedDiffIds(runs: JourneyRun[]): string[] {
  return runs.flatMap((run) => run.changedDiffIds);
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
  return (
    <ExplainedIcon description={props.description} className={props.className}>
      <DiffStatusIcon group={props.group} className="size-3.5" />
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
      description={JOURNEY_STATUS_LABELS[props.mark]}
      className={props.className}
    />
  );
}

/** What the journeys section reads from the build page around it. */
type JourneyPageContext = {
  params: BuildParams;
  /** The viewer's marks in the review under way, by diff id. */
  statuses: Record<string, EvaluationStatus>;
  /** The filters of the list: the test it is filtered on is shown first. */
  filters: ReadonlySet<string>;
};

function getTestFilterKey(test: Pick<JourneyTest, "key">): string {
  return getFilterKey({ category: FilterCategory.test, value: test.key });
}

/**
 * The filters a run opens the list with: its test, and what tells the run
 * from the other runs of the test.
 */
function getRunFilters(run: JourneyRun, test: JourneyTest): Set<string> {
  const filters = new Set([getTestFilterKey(test)]);
  if (test.showViewport && run.viewport) {
    filters.add(
      getFilterKey({
        category: FilterCategory.viewport,
        value: formatViewport(run.viewport),
      }),
    );
  }
  if (test.showBrowser && run.browser) {
    filters.add(
      getFilterKey({ category: FilterCategory.browser, value: run.browser }),
    );
  }
  if (test.showColorScheme && run.colorScheme) {
    filters.add(
      getFilterKey({
        category: FilterCategory.colorScheme,
        value: run.colorScheme,
      }),
    );
  }
  return filters;
}

/** A screen of a run, the list filtered on the run. */
function getRunScreenURL(
  page: JourneyPageContext,
  run: JourneyRun,
  test: JourneyTest,
  diffId: string,
): string {
  return withFilters(
    getBuildURL({ ...page.params, diffId }),
    getRunFilters(run, test),
  );
}

/**
 * The build's end-to-end tests that walk several screens, by file, each run
 * as a card. A run opens the build on its first screen, the list filtered on
 * the run and listed by test; a screen opens it on that screen: the review
 * then walks the run screen by screen, the way a user clicks through the app.
 *
 * A section of the page rather than a panel among others: when a build has
 * journeys, they are what its review goes through.
 */
export function JourneysSection(props: {
  build: Build;
  repoUrl: string | null;
}) {
  const params = useBuildParams();
  invariant(params, "journeys are shown on a build page");
  const statuses = useReviewStatuses();
  const filterState = use(FilterStateContext);
  invariant(filterState, "journeys are shown on a build page");
  return (
    <JourneysSectionView
      {...props}
      page={{
        params,
        statuses,
        filters: filterState.active,
      }}
    />
  );
}

export function JourneysSectionView(props: {
  build: Build;
  repoUrl: string | null;
  page: JourneyPageContext;
}) {
  const { build, repoUrl, page } = props;
  const headingId = useId();
  const groups = useMemo(
    () => getJourneyTestGroups(build.journeys, page.statuses),
    [build.journeys, page.statuses],
  );
  // A journey is a card: a test on one viewport or browser.
  const unchangedCount = groups.unchanged.reduce(
    (count, file) =>
      count + file.tests.reduce((runs, test) => runs + test.runs.length, 0),
    0,
  );
  const checkIsFiltered = (test: JourneyTest) =>
    page.filters.has(getTestFilterKey(test));
  // Folded even when nothing changed: open, the list would read as journeys
  // to review. Open when the list is filtered on one of them.
  const [showUnchanged, setShowUnchanged] = useState(() =>
    groups.unchanged.some((file) => file.tests.some(checkIsFiltered)),
  );
  if (groups.changed.length === 0 && groups.unchanged.length === 0) {
    return null;
  }
  const listProps = {
    checkIsFiltered,
    reviewBlocker: getBuildReviewBlocker(build),
    repo: { repoUrl, branch: build.branch },
    page,
  };
  return (
    <>
      {groups.changed.length > 0 ? (
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
            A journey is a test on one viewport or browser. Open one to review
            its screens in order.
          </p>
          <JourneyFileList
            files={groups.changed}
            className="mt-4"
            {...listProps}
          />
        </section>
      ) : null}
      {unchangedCount > 0 ? (
        <Details
          open={showUnchanged}
          onToggle={(event) => setShowUnchanged(event.currentTarget.open)}
        >
          <summary className="focus-ring text-low hover:text-default flex cursor-default list-none flex-col rounded-md transition">
            <span className="flex items-center gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                Unchanged journeys
                <UnchangedIcon
                  className={clsx(
                    "size-4.5 shrink-0",
                    lowTextColorClassNames[UNCHANGED_COLOR],
                  )}
                />
              </h2>
              <span className="ml-auto flex items-center gap-2 text-sm tabular-nums">
                {plural(unchangedCount, "journey")}
                <ChevronDownIcon className="size-4 shrink-0 transition [details[open]>summary_&]:rotate-180" />
              </span>
            </span>
            <span className="mt-0.5 text-sm">
              Nothing to review in these journeys.
            </span>
          </summary>
          {showUnchanged ? (
            <JourneyFileList
              files={groups.unchanged}
              className="mt-4"
              {...listProps}
            />
          ) : null}
        </Details>
      ) : null}
    </>
  );
}

const { icon: UnchangedIcon, color: UNCHANGED_COLOR } = getDiffGroupDefinition(
  ScreenshotDiffStatus.Unchanged,
);

/** The viewer's review of a file's changed screens, as the build counts it. */
function getFileReviewProgression(
  file: JourneyFile<JourneyTest>,
  statuses: Record<string, EvaluationStatus>,
) {
  const toReview = file.tests.flatMap((test) => getChangedDiffIds(test.runs));
  return {
    toReview,
    reviewed: toReview.filter(
      (diffId) =>
        statuses[diffId] === EvaluationStatus.Accepted ||
        statuses[diffId] === EvaluationStatus.Rejected,
    ),
    rejected: toReview.filter(
      (diffId) => statuses[diffId] === EvaluationStatus.Rejected,
    ),
  };
}

type RepositoryContext = { repoUrl: string | null; branch: string | null };

function JourneyFileList(props: {
  files: JourneyFile<JourneyTest>[];
  checkIsFiltered: (test: JourneyTest) => boolean;
  reviewBlocker: ReviewBlocker;
  repo: RepositoryContext;
  page: JourneyPageContext;
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
  file: JourneyFile<JourneyTest>;
  checkIsFiltered: (test: JourneyTest) => boolean;
  reviewBlocker: ReviewBlocker;
  repo: RepositoryContext;
  page: JourneyPageContext;
}) {
  const { file, checkIsFiltered, reviewBlocker, repo, page } = props;
  const href = file.path
    ? getRepositoryFileURL({ file: file.path, ...repo })
    : null;
  // The path once, the name standing out: when it is long, the folders give
  // way first.
  const fileLabel = (
    <>
      {file.dir ? <span className="text-low truncate">{file.dir}</span> : null}
      <span className="shrink-0 font-medium">{file.name}</span>
    </>
  );
  return (
    <li className={getSurfaceClassName({ elevation: 0 })}>
      {/* Stuck to the top while its journeys scroll by, so a long file keeps
          saying which one it is. */}
      <div className="bg-app border-b-thin sticky top-0 z-10 flex h-11 items-center gap-2 rounded-t-xl px-4">
        <FileCodeIcon className="text-low size-4 shrink-0" />
        {/* Named by the path itself: as flex items, the folders and the name
            would be read as two words. */}
        <h3 aria-label={file.path ?? file.name} className="flex min-w-0">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex min-w-0 rounded-xs text-sm hover:underline"
            >
              {fileLabel}
            </a>
          ) : (
            <span className="flex min-w-0 text-sm">{fileLabel}</span>
          )}
        </h3>
        {reviewBlocker ? null : (
          <div className="ml-auto shrink-0">
            <ReviewProgressBadge
              scale="xs"
              progression={getFileReviewProgression(file, page.statuses)}
            />
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-8 px-4 pt-4 pb-5">
        {file.tests.map((test) => (
          <JourneyTestItem
            key={test.key}
            test={test}
            context={getTestContext(test, file)}
            scrollIntoView={checkIsFiltered(test)}
            reviewBlocker={reviewBlocker}
            page={page}
          />
        ))}
      </ul>
    </li>
  );
}

const MAX_CHANGED_SCREEN_NAMES = 6;

type NamedScreen = JourneyScreen & {
  run: JourneyRun;
  /** The label, with its folder when another screen of the run shares it. */
  name: string;
};

/**
 * The screens that changed in any run of a test, once each, in journey order.
 * The runs of a test take the same screens at another size, and may name
 * them apart (`desktop/cart`, `mobile/cart`): a screen is known across runs
 * by its label and how many screens of its run came before with that label,
 * so `cart/index` and `account/index` stay two screens.
 */
function getChangedScreens(test: JourneyTest): NamedScreen[] {
  const byIdentity = new Map<string, NamedScreen>();
  for (const run of test.runs) {
    const labelCounts = new Map<string, number>();
    for (const screen of run.screens) {
      labelCounts.set(screen.label, (labelCounts.get(screen.label) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    for (const screen of run.screens) {
      const occurrence = seen.get(screen.label) ?? 0;
      seen.set(screen.label, occurrence + 1);
      const identity = `${screen.label}#${occurrence}`;
      if (!screen.changed || byIdentity.has(identity)) {
        continue;
      }
      const shared = (labelCounts.get(screen.label) ?? 0) > 1;
      byIdentity.set(identity, {
        ...screen,
        run,
        name: shared ? screen.key.split("/").slice(-2).join("/") : screen.label,
      });
    }
  }
  return Array.from(byIdentity.values()).sort(
    (a, b) => a.stepIndex - b.stepIndex,
  );
}

function JourneyTestItem(props: {
  test: JourneyTest;
  /** What the title path says besides the file, shown before the title. */
  context: string | null;
  /** Whether the list is filtered on it, to show it first. */
  scrollIntoView: boolean;
  reviewBlocker: ReviewBlocker;
  page: JourneyPageContext;
}) {
  const { test, context, scrollIntoView, reviewBlocker, page } = props;
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (scrollIntoView) {
      ref.current?.scrollIntoView({ block: "center" });
    }
  }, [scrollIntoView]);
  const mark =
    test.status === EvaluationStatus.Accepted ||
    test.status === EvaluationStatus.Rejected
      ? test.status
      : null;
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
              key={`${screen.run.key}:${screen.key}`}
              href={getRunScreenURL(page, screen.run, test, screen.diffId)}
              aria-label={`Screen ${screen.stepIndex + 1}, ${screen.name}, changed`}
              className="border-thin bg-app hover:bg-hover focus-ring text-xxs max-w-full truncate rounded-full px-1.5 transition"
            >
              {screen.name}
            </HeadlessLink>
          ))}
          {changedScreens.length > namedScreens.length ? (
            <span className="text-low text-xxs px-0.5 tabular-nums">
              +{changedScreens.length - namedScreens.length}
            </span>
          ) : null}
        </div>
      ) : null}
      <JourneyLineup test={test} reviewBlocker={reviewBlocker} page={page} />
    </li>
  );
}

/** A viewport's width over its height, a desktop's when it is unknown. */
function getViewportRatio(viewport: Viewport | null): number {
  return viewport ? viewport.width / viewport.height : 1.5;
}

/**
 * The first screen of a run as it showed, at twice the width the card draws
 * it: the top of a full-page capture, one viewport tall.
 */
function getFirstScreenTransformations(
  viewport: Viewport | null,
  width: number,
): string[] {
  return [
    `w-${width}`,
    `h-${Math.round(width / getViewportRatio(viewport))}`,
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
  page: JourneyPageContext;
}) {
  const { test, reviewBlocker, page } = props;
  return (
    <ul className="mt-3 grid gap-4 sm:grid-cols-2">
      {test.runs.map((run) => (
        <JourneyRunItem
          key={run.key}
          run={run}
          test={test}
          reviewBlocker={reviewBlocker}
          page={page}
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

function getScreenWidthPercent(viewport: Viewport | null): number {
  return Math.min(
    100,
    Math.round(
      (getViewportRatio(viewport) / IMAGE_AREA_RATIO / SHOWN_SCREEN_SHARE) *
        100,
    ),
  );
}

function JourneyRunItem(props: {
  run: JourneyRun;
  test: JourneyTest;
  reviewBlocker: ReviewBlocker;
  page: JourneyPageContext;
}) {
  const { run, test, reviewBlocker, page } = props;
  const { screens, viewport, browser, colorScheme } = run;
  const [firstScreen] = screens;
  invariant(firstScreen, "a journey has at least one screen");
  const label = getRunLabel(run, test);
  const changed = screens.filter((screen) => screen.changed);
  const reviewStatuses = page.statuses;
  const mark = getReviewMark(run.changedDiffIds, reviewStatuses);
  const reviewedCount = changed.filter((screen) => {
    const status = reviewStatuses[screen.diffId];
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
    // `isolate`: the card draws its ring above its image, which would also put
    // it above its file's sticky header.
    <li className="isolate">
      <HeadlessLink
        href={getRunScreenURL(page, run, test, firstScreen.diffId)}
        aria-label={`Walk “${test.title}”${label ? ` at ${label}` : ""}`}
        className="group/item block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--ring-color-default)"
      >
        <DiffCard
          isActive={false}
          variant={
            changed.length > 0 && !reviewBlocker
              ? getReviewDiffCardVariant(mark)
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
                // The first screen that changed, the walk shows the rest. A
                // run that changed nothing shows how it starts.
                screenshotDiff={run.cover}
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
