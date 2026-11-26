import {
  createContext,
  startTransition,
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApolloClient } from "@apollo/client/react";
import {
  checkIsMultiStepJourney,
  compareSteps,
  getCaptureIndex,
  getStepLabel,
  getVariantSignature,
  groupJourneys,
  resolveJourneyIdentity,
  resolveTestIdentity,
  walkJourneySteps,
  type JourneyIdentity,
} from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { ResultOf } from "@graphql-typed-document-node/core";
import { MatchData, Searcher } from "fast-fuzzy";
import { useNavigate } from "react-router";

import {
  ATTENTION_STATUSES,
  checkIsDiffGroupName,
  DIFF_GROUPS,
  getDiffStatusGroup,
  JOURNEY_DIFF_GROUP,
  SKIPPED_DIFF_GROUP,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";

import {
  getBuildOverviewURL,
  getBuildURL,
  useBuildParams,
  type BuildParams,
} from "./BuildParams";
import { useBuildReviewState } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import { FilterStateContext } from "./metadata/filters/FilterState";
import {
  diffMatchesFilters,
  FilterCategory,
  getFilterKey,
  serializeJourneySearch,
  useCreateFilterState,
  useJourneySearchState,
} from "./metadata/filters/util";
import { resolveDiffMetadata } from "./metadata/utils";
import {
  useSnapshotDisplay,
  useSnapshotGrouping,
  type SnapshotDisplay,
  type SnapshotGrouping,
} from "./SnapshotListPreferences";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScreenshotDiffFragment = graphql(`
  fragment BuildDiffState_ScreenshotDiff on ScreenshotDiff {
    id
    status
    url
    name
    parentName
    variantKey
    width
    height
    group
    threshold
    contentType
    baseScreenshot {
      id
      name
      url
      originalUrl
      width
      height
      contentType
      metadata {
        url
        previewUrl
        description
        colorScheme
        mediaType
        automationLibrary {
          name
          version
        }
        browser {
          name
          version
        }
        sdk {
          name
          version
          latestVersion
        }
        story {
          id
          mode
          play
          tags
        }
        capture {
          index
        }
        viewport {
          width
          height
        }
        test {
          id
          title
          titlePath
          location {
            file
            line
            column
          }
          retry
          retries
          repeat
          annotations {
            type
            description
            location {
              file
              line
              column
            }
          }
          tags
        }
        tags
      }
    }
    compareScreenshot {
      id
      name
      url
      originalUrl
      width
      height
      contentType
      metadata {
        url
        previewUrl
        description
        colorScheme
        mediaType
        automationLibrary {
          name
          version
        }
        browser {
          name
          version
        }
        sdk {
          name
          version
          latestVersion
        }
        story {
          id
          mode
          play
          tags
        }
        capture {
          index
        }
        viewport {
          width
          height
        }
        test {
          id
          title
          titlePath
          location {
            file
            line
            column
          }
          retry
          retries
          repeat
          annotations {
            type
            description
            location {
              file
              line
              column
            }
          }
          tags
        }
        tags
      }
      playwrightTraceUrl
    }
    ...BuildDiffDetail_ScreenshotDiff
  }
`);

export type Diff = ResultOf<typeof ScreenshotDiffFragment>;

export type DiffResult = MatchData<Diff>;

type DiffListGroupBase = {
  diffs: Diff[];
  /** Whether the group is open until the reader opens or closes it. */
  defaultExpanded: boolean;
};

export type DiffListGroup =
  | (DiffListGroupBase & { type: "status"; name: DiffGroupName })
  | (DiffListGroupBase & {
      type: "test";
      name: string;
      /** Null for the group of the snapshots that come from no test. */
      test: JourneyIdentity | null;
    });

/**
 * A request to bring a diff into view in the list. An object rather than the
 * diff, so asking twice for the same diff still asks twice.
 */
type ScrollRequest = {
  diff: Diff;
  /**
   * The list was just regrouped or redrawn at another density: what is on
   * screen says nothing about where the diff now is, and there is no path to
   * animate along.
   */
  reflowed: boolean;
};

type BuildDiffContextValue = {
  diffs: Diff[];
  allDiffs: Diff[];
  grouping: SnapshotGrouping;
  /** Regroups the list, keeping the active diff open and in view. */
  setGrouping: (grouping: SnapshotGrouping) => void;
  /** Changes how the list draws diffs, keeping the active one in view. */
  setDisplay: (display: SnapshotDisplay) => void;
  groups: DiffListGroup[];
  /** The groups of the list that are open, and the stacks opened by hand. */
  expanded: ReadonlySet<string>;
  toggleGroup: (name: string, value?: boolean) => void;
  /**
   * Whether the similar diffs of `group` are stacked and closed, so they are
   * marked and walked past as one. Listed by test or walking a journey,
   * nothing is stacked.
   */
  isStackCollapsed: (group: string | null | undefined) => boolean;
  activeDiff: Diff | null;
  setActiveDiff: (diff: Diff, scroll?: boolean) => void;
  scrollRequest: ScrollRequest | null;
  initialDiff: Diff | null;
  firstDiff: Diff | null;
  ready: boolean;
  stats: BuildStats | null;
  results: DiffResult[];
  hasNoResults: boolean;
  /**
   * Indicates if the build is marked as "subset".
   */
  isSubsetBuild: boolean;
  /**
   * Some diffs are still loading.
   */
  isLoading: boolean;
  /**
   * Sibling diffs are diffs that have the same base name.
   * This can be used to navigate between diffs that are similar.
   */
  siblingDiffs: Diff[];
  /**
   * Aria version of the diff.
   */
  ariaDiff: Diff | null;
  /**
   * A journey filter is active: the list walks the journey screen by screen,
   * in one section, instead of sorting it by status.
   */
  journeyMode: boolean;
  /** The journeys of the build: the tests that walk several screens. */
  journeys: BuildJourney[];
  /** The journeys the filter walks, none outside of journey mode. */
  walkedJourneys: BuildJourney[];
  /** Where each walked screen sits in its journey ("2 · cart"), by diff id. */
  journeyStepLabels: Map<string, string>;
};

const BuildDiffContext = createContext<BuildDiffContextValue | null>(null);

/**
 * Check if the diff can be reviewed.
 */
export function checkDiffCanBeReviewed(
  diffStatus: ScreenshotDiffStatus,
  context: {
    /**
     * Indicates if the build is marked as subset.
     */
    isSubsetBuild: boolean;
  },
) {
  if (context.isSubsetBuild) {
    return (
      diffStatus === ScreenshotDiffStatus.Changed ||
      diffStatus === ScreenshotDiffStatus.Added
    );
  }
  return (
    diffStatus === ScreenshotDiffStatus.Changed ||
    diffStatus === ScreenshotDiffStatus.Added ||
    diffStatus === ScreenshotDiffStatus.Removed
  );
}

/**
 * Number of removals to account for. Subset builds only upload part of the
 * snapshots, so a missing snapshot means a skipped test, not a deletion: they
 * are ignored everywhere changes are counted or described.
 */
export function getRemovedCount(
  stats: { removed: number },
  context: { isSubsetBuild: boolean },
): number {
  return context.isSubsetBuild ? 0 : stats.removed;
}

/**
 * Number of snapshots up for review, mirroring `checkDiffCanBeReviewed` at the
 * stats level.
 */
export function getReviewableCount(
  stats: { changed: number; added: number; removed: number },
  context: { isSubsetBuild: boolean },
): number {
  return stats.changed + stats.added + getRemovedCount(stats, context);
}

export function useBuildDiffState() {
  const context = use(BuildDiffContext);
  invariant(
    context,
    "useBuildDiffState must be used within a BuildDiffProvider",
  );
  return context;
}

function useActiveDiffIndex() {
  const { diffs, activeDiff } = useBuildDiffState();
  return activeDiff ? diffs.indexOf(activeDiff) : -1;
}

export function useHasNextDiff() {
  const { diffs } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  return activeDiffIndex < diffs.length - 1;
}

export interface UseGetNextDiffOptions {
  /**
   * The search starts after this index; pass -1 to search from the top of
   * the list. Default to the active diff index.
   */
  fromIndex?: number;
}

export function useGetNextDiff(
  predicate?: (diff: Diff) => boolean,
  options?: UseGetNextDiffOptions,
) {
  const { searchMode } = useSearchModeState();
  const { diffs, activeDiff, isStackCollapsed } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  const fromIndex = options?.fromIndex ?? activeDiffIndex;
  return useEventCallback(() => {
    if (fromIndex >= diffs.length - 1) {
      return null;
    }

    const collapsedStack =
      activeDiff?.group && isStackCollapsed(activeDiff.group) && !searchMode
        ? activeDiff.group
        : null;

    if (!collapsedStack && !predicate) {
      return diffs[fromIndex + 1] ?? null;
    }

    const offsetIndex = fromIndex + 1;
    const nextDiffIndex = diffs.slice(offsetIndex).findIndex((diff) => {
      if (collapsedStack && diff.group === collapsedStack) {
        return false;
      }
      return predicate ? predicate(diff) : true;
    });

    if (nextDiffIndex !== -1) {
      return diffs[nextDiffIndex + offsetIndex] ?? null;
    }

    return null;
  });
}

export function useGoToNextDiff() {
  const getNextDiff = useGetNextDiff();
  const { setActiveDiff } = useBuildDiffState();
  return useEventCallback(() => {
    const nextDiff = getNextDiff();
    if (nextDiff) {
      setActiveDiff(nextDiff, true);
    }
  });
}

export function useHasPreviousDiff() {
  const activeDiffIndex = useActiveDiffIndex();
  return activeDiffIndex > 0;
}

function useGetPreviousDiff() {
  const { searchMode } = useSearchModeState();
  const { diffs, isStackCollapsed } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  const hasPreviousDiff = useHasPreviousDiff();
  return useEventCallback(() => {
    if (!hasPreviousDiff) {
      return null;
    }

    const previousDiffIndex = activeDiffIndex - 1;
    const previousDiff = diffs[previousDiffIndex];

    if (!previousDiff) {
      return null;
    }

    if (!isStackCollapsed(previousDiff.group) || searchMode) {
      return previousDiff;
    }

    const firstOfTheGroupIndex = diffs
      .slice(0, previousDiffIndex)
      .findIndex((diff) => diff.group === previousDiff.group);

    if (firstOfTheGroupIndex !== -1) {
      return diffs[firstOfTheGroupIndex] ?? null;
    }

    // Fallback to the previous diff if there is no first of the group (means we have a group of one single diff).
    return previousDiff;
  });
}

export function useGoToPreviousDiff() {
  const getPreviousDiff = useGetPreviousDiff();
  const { setActiveDiff, activeDiff, journeyMode } = useBuildDiffState();
  const params = useBuildParams();
  const navigate = useNavigate();
  return useEventCallback(() => {
    const previousDiff = getPreviousDiff();
    if (previousDiff) {
      setActiveDiff(previousDiff, true);
      return;
    }
    // From the first diff, going up returns to the build overview. Not from
    // the first screen of a journey: the walk stops there, one keypress
    // should not end it.
    if (activeDiff && params && !journeyMode) {
      navigate(getBuildOverviewURL(params), { replace: true });
    }
  });
}

export function useGoToBuildOverview() {
  const params = useBuildParams();
  const navigate = useNavigate();
  return useEventCallback(() => {
    if (params) {
      navigate(getBuildOverviewURL(params), { replace: true });
    }
  });
}

/**
 * The groups the reader opened or closed by hand. A group left alone follows
 * its `defaultExpanded`, so one that shows up as the diffs load, or as the
 * list is regrouped, opens or not without undoing what was chosen before.
 */
function useGroupToggles() {
  const [toggles, setToggles] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  );
  const setToggle = useCallback((name: string, expanded: boolean) => {
    setToggles((toggles) =>
      toggles.get(name) === expanded
        ? toggles
        : new Map(toggles).set(name, expanded),
    );
  }, []);
  return { toggles, setToggle };
}

function getExpandedGroups(
  groups: DiffListGroup[],
  toggles: ReadonlyMap<string, boolean>,
): ReadonlySet<string> {
  const expanded = new Set<string>();
  for (const group of groups) {
    if (toggles.get(group.name) ?? group.defaultExpanded) {
      expanded.add(group.name);
    }
  }
  // Also the stacks of similar diffs (`diff.group`) opened by hand, which are
  // not groups of the list.
  for (const [name, value] of toggles) {
    if (value) {
      expanded.add(name);
    }
  }
  return expanded;
}

const ProjectQuery = graphql(`
  query BuildDiffState_Project(
    $accountSlug: String!
    $projectName: String!
    $buildNumber: Int!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      build(number: $buildNumber) {
        id
        screenshotDiffs(after: $after, first: $first) {
          pageInfo {
            hasNextPage
          }
          edges {
            ...BuildDiffState_ScreenshotDiff
          }
        }
      }
    }
  }
`);

function useDataState(props: {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
}) {
  const { accountSlug, projectName, buildNumber } = props;
  const apolloClient = useApolloClient();
  const [error, setError] = useState<unknown>(null);
  if (error) {
    throw error;
  }
  const [state, setState] = useState<{ diffs: Diff[]; hasMore: boolean }>({
    diffs: [],
    hasMore: true,
  });
  useEffect(() => {
    if (!state.hasMore) {
      return;
    }
    let outdated = false;
    apolloClient
      .query({
        query: ProjectQuery,
        fetchPolicy: "no-cache",
        variables: {
          accountSlug,
          projectName,
          buildNumber,
          after: state.diffs.length,
          first: state.diffs.length === 0 ? 20 : 100,
        },
      })
      .then((result) => {
        if (outdated) {
          return;
        }
        const diffs = result.data?.project?.build?.screenshotDiffs;
        if (!diffs) {
          setState((prev) => ({ ...prev, hasMore: false }));
          return;
        }
        setState((prev) => ({
          diffs: [...prev.diffs, ...diffs.edges],
          hasMore: diffs.pageInfo.hasNextPage,
        }));
      })
      .catch((error) => {
        if (outdated) {
          return;
        }
        setError(error);
      });
    return () => {
      outdated = true;
    };
  }, [
    apolloClient,
    accountSlug,
    projectName,
    buildNumber,
    state.hasMore,
    state.diffs.length,
  ]);
  return state;
}

/**
 * The status group a diff is listed in: its review once it has one, the group
 * of its own status until then. Null for a diff the list does not show.
 */
export function getDiffListStatus(
  diff: Diff,
  reviewStatus: EvaluationStatus | null,
  context: { isSubsetBuild: boolean },
): DiffGroupName | null {
  const name =
    reviewStatus && reviewStatus !== EvaluationStatus.Pending
      ? reviewStatus
      : getDiffStatusGroup(diff.status, context);
  return checkIsDiffGroupName(name) ? name : null;
}

/**
 * The status, among those given, that comes first in a list grouped by
 * status: the most pressing one.
 */
export function getFirstListedStatus(
  statuses: ReadonlySet<DiffGroupName>,
): DiffGroupName {
  const status = DIFF_GROUPS.find((status) => statuses.has(status));
  invariant(status, "a group lists at least one diff");
  return status;
}

function groupDiffsByStatus(
  diffs: Diff[],
  context: {
    isSubsetBuild: boolean;
    searchMode: boolean;
    reviewStatuses: Record<string, EvaluationStatus>;
  },
): DiffListGroup[] {
  const defaultExpanded: readonly DiffGroupName[] = context.searchMode
    ? SEARCH_EXPANDED
    : ATTENTION_STATUSES;
  const diffByGroups = new Map<DiffGroupName, Diff[]>();
  for (const diff of diffs) {
    const name = getDiffListStatus(
      diff,
      context.reviewStatuses[diff.id] ?? null,
      context,
    );
    if (name) {
      const groupDiffs = diffByGroups.get(name) ?? [];
      diffByGroups.set(name, groupDiffs);
      groupDiffs.push(diff);
    }
  }
  return DIFF_GROUPS.flatMap((name) => {
    const groupDiffs = diffByGroups.get(name);
    return groupDiffs
      ? [
          {
            type: "status" as const,
            name,
            diffs: groupDiffs,
            defaultExpanded: defaultExpanded.includes(name),
          },
        ]
      : [];
  });
}

/**
 * The one group of a journey walk: its screens in the order the test took
 * them, whatever their status. A reviewed screen keeps its place: it is still
 * a step of the journey.
 */
function groupDiffsAlongJourneys(
  diffs: Diff[],
  /** Position of each screen in the walk. */
  walkOrder: Map<string, number>,
): DiffListGroup[] {
  const getPosition = (diff: Diff) =>
    walkOrder.get(diff.id) ?? Number.MAX_SAFE_INTEGER;
  return [
    {
      type: "status",
      name: JOURNEY_DIFF_GROUP,
      diffs: diffs.toSorted((a, b) => getPosition(a) - getPosition(b)),
      defaultExpanded: true,
    },
  ];
}

const NO_TEST_GROUP = "no-test";

/**
 * The name of a test's group. Its key goes behind a prefix: the names of every
 * grouping share `expanded` with the status names and the stacks of similar
 * diffs.
 */
function getTestGroupName(test: JourneyIdentity | null): string {
  return test ? `test:${test.key}` : NO_TEST_GROUP;
}

/**
 * Groups the diffs by the test they come from, in the order the test took
 * them. Tests are listed by the most pressing status among their diffs, then
 * by name, and the ones with a diff to look at start open.
 *
 * Built from the statuses the build came with, not from the review: a test
 * does not move as its diffs are marked, and marking one does not regroup the
 * build. The header reads the review on its own.
 */
function groupDiffsByTest(
  diffs: Diff[],
  context: { isSubsetBuild: boolean; searchMode: boolean },
): DiffListGroup[] {
  const tests = new Map<
    string,
    {
      test: JourneyIdentity | null;
      steps: { key: string; captureIndex: number | null; diff: Diff }[];
      statuses: Set<DiffGroupName>;
    }
  >();
  for (const diff of diffs) {
    const status = getDiffListStatus(diff, null, context);
    if (!status) {
      continue;
    }
    const metadata = resolveDiffMetadata(diff);
    const test = resolveTestIdentity(metadata);
    const name = getTestGroupName(test);
    const group = tests.get(name) ?? { test, steps: [], statuses: new Set() };
    tests.set(name, group);
    group.steps.push({
      key: diff.name,
      captureIndex: getCaptureIndex(metadata),
      diff,
    });
    group.statuses.add(status);
  }
  return Array.from(tests, ([name, { test, steps, statuses }]) => ({
    rank: DIFF_GROUPS.indexOf(getFirstListedStatus(statuses)),
    group: {
      type: "test" as const,
      name,
      test,
      diffs: steps.toSorted(compareSteps).map((step) => step.diff),
      defaultExpanded:
        context.searchMode ||
        ATTENTION_STATUSES.some((status) => statuses.has(status)),
    },
  }))
    .toSorted(
      (a, b) =>
        a.rank - b.rank ||
        Number(a.group.test === null) - Number(b.group.test === null) ||
        a.group.name.localeCompare(b.group.name),
    )
    .map(({ group }) => group);
}

function findDiffGroup(
  groups: DiffListGroup[],
  diff: Diff | null,
): DiffListGroup | null {
  if (!diff) {
    return null;
  }
  return groups.find((group) => group.diffs.includes(diff)) ?? null;
}

type SearchModeContextValue = {
  searchMode: boolean;
  setSearchMode: (enabled: boolean) => void;
};

const SearchModeContext = createContext<SearchModeContextValue | null>(null);

export function useSearchModeState() {
  const context = use(SearchModeContext);
  invariant(
    context,
    "useSearchModeState must be used within a BuildDiffProvider",
  );
  return context;
}

type SearchContextValue = {
  search: string;
  setSearch: (search: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchState() {
  const context = use(SearchContext);
  invariant(context, "useSearchState must be used within a BuildDiffProvider");
  return context;
}

const _BuildDiffStateFragment = graphql(`
  fragment BuildDiffState_Build on Build {
    id
    subset
    stats {
      ...BuildStatsIndicator_BuildStats
      total
      failure
      changed
      added
      removed
      unchanged
      retryFailure
    }
    journeys {
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
      }
      steps {
        key
        diffs {
          id
          name
          variantKey
          status
        }
      }
    }
  }
`);

type BuildStats = DocumentType<typeof _BuildDiffStateFragment>["stats"];

export type BuildJourney = DocumentType<
  typeof _BuildDiffStateFragment
>["journeys"][number];

const NO_JOURNEYS: BuildJourney[] = [];

/**
 * The status groups open by default while searching. Out of search, only the
 * `ATTENTION_STATUSES` are.
 */
const SEARCH_EXPANDED: readonly DiffGroupName[] = [
  ...ATTENTION_STATUSES,
  ScreenshotDiffStatus.Unchanged,
  ScreenshotDiffStatus.RetryFailure,
  SKIPPED_DIFF_GROUP,
];

/**
 * Visibility of the journey drawer in the build detail, persisted as a user
 * preference.
 */
const JOURNEY_DRAWER_STORAGE_KEY = "preferences.build.journey-drawer";

type JourneyDrawerContextValue = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  /**
   * The diff the list would have opened when the review left it to walk a
   * journey, to come back to once the journey is reviewed.
   */
  listResumeRef: React.RefObject<Diff | null>;
};

const JourneyDrawerContext = createContext<JourneyDrawerContextValue | null>(
  null,
);

export function useJourneyDrawerState() {
  const context = use(JourneyDrawerContext);
  invariant(
    context,
    "useJourneyDrawerState must be used within a BuildDiffProvider",
  );
  return context;
}

export type ActiveDiffJourney = {
  identity: JourneyIdentity;
  /** The steps of the journey in order, each with its variants. */
  steps: { key: string; diffs: Diff[] }[];
  /** Position of the active diff's step in `steps`. */
  stepIndex: number;
};

/**
 * The journey context of the active diff: the journey it belongs to, its steps
 * (variants collapsed) in order, and the active step position. Null when the
 * active diff has no journey information or the journey has a single step —
 * a test that captures one screen is regular visual testing, not a journey.
 *
 * Built from `allDiffs`, not from the filtered list: a journey is worth showing
 * whole, so the screens that did not change are in it too, and the drawer marks
 * the ones that did.
 */
export function useActiveDiffJourney(): ActiveDiffJourney | null {
  const { activeDiff, allDiffs } = useBuildDiffState();
  return useMemo(
    () => (activeDiff ? getDiffJourney(activeDiff, allDiffs) : null),
    [activeDiff, allDiffs],
  );
}

function getDiffJourney(
  activeDiff: Diff,
  allDiffs: Diff[],
): ActiveDiffJourney | null {
  const identity = resolveJourneyIdentity(resolveDiffMetadata(activeDiff));
  if (!identity) {
    return null;
  }
  const [journey] = groupJourneys(
    allDiffs.filter(
      (diff) =>
        resolveJourneyIdentity(resolveDiffMetadata(diff))?.key === identity.key,
    ),
    resolveDiffMetadata,
  );
  if (!journey || !checkIsMultiStepJourney(journey)) {
    return null;
  }
  const { steps } = journey;
  return {
    identity,
    steps,
    stepIndex: steps.findIndex((step) => step.key === activeDiff.variantKey),
  };
}

/**
 * The diff of `step` that is the same variant as `reference` (same browser,
 * viewport, scheme…), or the step's first diff when that variant is missing.
 * Moving between steps stays on one viewport this way.
 */
export function pickStepDiff(
  step: ActiveDiffJourney["steps"][number],
  reference: Diff,
): Diff | null {
  const signature = getVariantSignature(reference);
  return (
    step.diffs.find((diff) => getVariantSignature(diff) === signature) ??
    step.diffs[0] ??
    null
  );
}

/**
 * The diff to open once the active diff is marked, `getListNextDiff` unless
 * the journey drawer is open. Then the review walks the journey on screen: the
 * next step `predicate` accepts, wrapping around to the steps before the
 * active one so a journey entered in the middle is reviewed whole. Once the
 * journey has nothing left, it goes back to the diff the list would have
 * opened when the review left it, or the diffs it jumped over would be left
 * behind: a marked diff moves to the bottom of the list.
 *
 * Call it before the mark lands, like `getListNextDiff`: the active diff, and
 * the rest of its group when the group is collapsed, still read as pending.
 */
export function useGetNextDiffThroughJourney(
  predicate: (diff: Diff) => boolean,
  getListNextDiff: () => Diff | null,
) {
  const { visible, listResumeRef } = useJourneyDrawerState();
  const { activeDiff, allDiffs, diffs, isStackCollapsed } = useBuildDiffState();
  return useEventCallback((): Diff | null => {
    const listNextDiff = getListNextDiff();
    if (!activeDiff) {
      return listNextDiff;
    }
    const markedGroup =
      activeDiff.group && isStackCollapsed(activeDiff.group)
        ? activeDiff.group
        : null;
    const checkIsNext = (diff: Diff) =>
      diff !== activeDiff &&
      (markedGroup === null || diff.group !== markedGroup) &&
      diffs.includes(diff) &&
      predicate(diff);
    const journey = visible ? getDiffJourney(activeDiff, allDiffs) : null;
    if (journey) {
      const { steps, stepIndex } = journey;
      const stepDiff = [
        ...steps.slice(stepIndex + 1),
        ...steps.slice(0, stepIndex),
      ]
        .map((step) => pickStepDiff(step, activeDiff))
        .find((diff) => diff !== null && checkIsNext(diff));
      if (stepDiff) {
        if (stepDiff !== listNextDiff) {
          listResumeRef.current ??= listNextDiff;
        }
        return stepDiff;
      }
    }
    const resumeDiff = listResumeRef.current;
    listResumeRef.current = null;
    return resumeDiff && checkIsNext(resumeDiff) ? resumeDiff : listNextDiff;
  });
}

export function BuildDiffProvider(props: {
  children: React.ReactNode;
  build: DocumentType<typeof _BuildDiffStateFragment> | null;
  params: BuildParams;
}) {
  const { children, params, build } = props;
  const reviewState = useBuildReviewState();
  const stats = build?.stats ?? null;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [searchMode, setSearchMode] = useState(false);
  const navigate = useNavigate();
  const [grouping, setGroupingPreference] = useSnapshotGrouping();
  const [, setDisplayPreference] = useSnapshotDisplay();
  const listToggles = useGroupToggles();
  const searchToggles = useGroupToggles();
  const { toggles, setToggle } = searchMode ? searchToggles : listToggles;

  const { diffs: allDiffs, hasMore } = useDataState(params);

  // Build all indices to reduce the number of iterations.
  const indices = useMemo(() => {
    return allDiffs.reduce<{
      byId: Record<string, Diff>;
      byVariantKey: Record<string, Diff[]>;
      byParentName: Record<string, Diff[]>;
      noParentName: Diff[];
    }>(
      (indices, diff) => {
        if (diff.parentName) {
          const byParentName = indices.byParentName[diff.parentName] ?? [];
          indices.byParentName[diff.parentName] = byParentName;
          byParentName.push(diff);
        } else {
          indices.byId[diff.id] = diff;
          const byVariantKey = indices.byVariantKey[diff.variantKey] ?? [];
          indices.byVariantKey[diff.variantKey] = byVariantKey;
          byVariantKey.push(diff);
          indices.noParentName.push(diff);
        }
        return indices;
      },
      { byId: {}, byVariantKey: {}, byParentName: {}, noParentName: [] },
    );
  }, [allDiffs]);

  const screenshotDiffs = indices.noParentName;
  const complete = Boolean(stats && screenshotDiffs.length === stats?.total);
  const isSubsetBuild = build?.subset ?? false;
  const firstDiff = useMemo(() => {
    // The server sorts skipped snapshots with the removed ones, before the
    // unchanged: the first pages of a subset build can hold nothing else, so
    // wait for one that brings a snapshot that was run.
    if (isSubsetBuild) {
      const candidate = screenshotDiffs.find(
        (diff) => diff.status !== ScreenshotDiffStatus.Removed,
      );
      if (candidate || !complete) {
        return candidate ?? null;
      }
    }
    return screenshotDiffs[0] ?? null;
  }, [screenshotDiffs, isSubsetBuild, complete]);
  const firstDiffId = firstDiff?.id ?? null;

  const searcher = useMemo(() => {
    return new Searcher(screenshotDiffs, {
      keySelector: (filter) => [filter.name],
      threshold: 0.8,
      returnMatchData: true,
      ignoreSymbols: false,
    });
  }, [screenshotDiffs]);

  const results = useMemo(
    () => (searchMode ? searcher.search(deferredSearch) : []),
    [searchMode, searcher, deferredSearch],
  );

  const journeys = build?.journeys ?? NO_JOURNEYS;
  const filterState = useCreateFilterState(screenshotDiffs, journeys);
  const journeyDiffIds = useMemo(
    () =>
      new Map(
        journeys.map((journey) => [
          journey.id,
          new Set(
            journey.steps.flatMap((step) => step.diffs.map((diff) => diff.id)),
          ),
        ]),
      ),
    [journeys],
  );
  const walkedJourneys = useMemo(
    () =>
      journeys.filter((journey) =>
        filterState.active.has(
          getFilterKey({ category: FilterCategory.journey, value: journey.id }),
        ),
      ),
    [journeys, filterState.active],
  );
  const journeyMode = walkedJourneys.length > 0;
  const { walkOrder, journeyStepLabels } = useMemo(() => {
    const walkOrder = new Map<string, number>();
    const journeyStepLabels = new Map<string, string>();
    for (const journey of walkedJourneys) {
      journey.steps.forEach((step, index) => {
        for (const diff of step.diffs) {
          journeyStepLabels.set(
            diff.id,
            `${index + 1} · ${getStepLabel(step.key)}`,
          );
        }
      });
      for (const diff of walkJourneySteps(journey.steps)) {
        walkOrder.set(diff.id, walkOrder.size);
      }
    }
    return { walkOrder, journeyStepLabels };
  }, [walkedJourneys]);

  const filteredDiffs = useMemo(() => {
    let diffs = searchMode
      ? results.map((result) => result.item)
      : screenshotDiffs;
    if (filterState.active.size > 0) {
      diffs = diffs.filter((diff) =>
        diffMatchesFilters(diff, filterState.active, { journeyDiffIds }),
      );
    }
    return diffs;
  }, [
    screenshotDiffs,
    results,
    searchMode,
    filterState.active,
    journeyDiffIds,
  ]);

  const [initialDiffIdParam] = useState(params.diffId);
  const initialDiffId = initialDiffIdParam ?? firstDiffId;

  const initialDiff =
    (initialDiffId ? indices.byId[initialDiffId] : null) ?? null;
  const activeDiff =
    (params.diffId ? indices.byId[params.diffId] : null) ?? null;
  const siblingDiffs = useMemo(
    () =>
      activeDiff ? (indices.byVariantKey[activeDiff.variantKey] ?? []) : [],
    [activeDiff, indices],
  );
  const ariaDiff = useMemo(() => {
    if (!activeDiff) {
      return null;
    }
    const children = indices.byParentName[activeDiff.name] ?? [];
    return children.length === 1 && children[0] ? children[0] : null;
  }, [activeDiff, indices]);

  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(
    null,
  );

  const [drawerVisible, setDrawerVisibleState] = useState<boolean>(
    () => localStorage.getItem(JOURNEY_DRAWER_STORAGE_KEY) === "true",
  );
  const setDrawerVisible = useCallback((visible: boolean) => {
    localStorage.setItem(JOURNEY_DRAWER_STORAGE_KEY, String(visible));
    setDrawerVisibleState(visible);
  }, []);
  const listResumeRef = useRef<Diff | null>(null);
  const drawerValue = useMemo(
    (): JourneyDrawerContextValue => ({
      // The strip is how a journey shows on screen: walking one opens it,
      // without touching the preference.
      visible: drawerVisible || journeyMode,
      setVisible: setDrawerVisible,
      listResumeRef,
    }),
    [drawerVisible, journeyMode, setDrawerVisible],
  );

  // Out of the memo's dependencies when listed by test, which the review does
  // not regroup.
  const groupingReviewStatuses =
    grouping === "status" && !journeyMode
      ? reviewState?.diffStatuses
      : undefined;
  const groups = useMemo(() => {
    if (journeyMode) {
      return groupDiffsAlongJourneys(filteredDiffs, walkOrder);
    }
    const context = { isSubsetBuild, searchMode };
    return grouping === "test"
      ? groupDiffsByTest(filteredDiffs, context)
      : groupDiffsByStatus(filteredDiffs, {
          ...context,
          reviewStatuses: groupingReviewStatuses ?? {},
        });
  }, [
    filteredDiffs,
    groupingReviewStatuses,
    isSubsetBuild,
    searchMode,
    grouping,
    journeyMode,
    walkOrder,
  ]);

  const expanded = useMemo(
    () => getExpandedGroups(groups, toggles),
    [groups, toggles],
  );

  const toggleGroup = useEventCallback((name: string, value?: boolean) => {
    setToggle(name, value ?? !expanded.has(name));
  });

  // A journey is walked screen by screen: screens that changed the same way
  // stay apart.
  const isStackCollapsed = useCallback(
    (group: string | null | undefined) =>
      Boolean(
        group && grouping === "status" && !journeyMode && !expanded.has(group),
      ),
    [grouping, journeyMode, expanded],
  );

  const sortedDiffs = useMemo(() => {
    return groups.flatMap((group) => group.diffs);
  }, [groups]);

  const getDiffGroup = useEventCallback((diff: Diff | null) =>
    findDiffGroup(groups, diff),
  );

  // Read from the URL, not from the filters: a journey the list has not
  // loaded yet is not a filter yet, and must survive the navigation all the same.
  const [journeyKeys] = useJourneySearchState();
  const setActiveDiff = useEventCallback((diff: Diff, scroll?: boolean) => {
    navigate(
      {
        pathname: getBuildURL({
          accountSlug: params.accountSlug,
          buildNumber: params.buildNumber,
          projectName: params.projectName,
          diffId: diff.id,
        }),
        search: serializeJourneySearch({ journey: journeyKeys }),
      },
      { replace: true },
    );

    if (scroll) {
      startTransition(() => {
        setScrollRequest({ diff, reflowed: false });
        const group = getDiffGroup(diff);
        invariant(group, "the active diff always belongs to a group");
        toggleGroup(group.name, true);
      });
    }
  });

  // A journey picked from the filters, or a link to a screenshot it does not
  // have, starts the walk on its first screen: the screenshot shown before is
  // not in the list anymore.
  const walkStart = journeyMode ? (groups[0]?.diffs[0] ?? null) : null;
  const [firstWalkedId] = walkOrder.keys();
  const firstWalkedLoaded = Boolean(
    firstWalkedId && indices.byId[firstWalkedId],
  );
  const walkKey = walkedJourneys.map((journey) => journey.id).join(",");
  // Checked once per change of the walked journeys, not on each navigation:
  // a link to another journey changes the screenshot a render before the
  // journey filter follows it from the URL, and in that render the new
  // screenshot is not in the walk yet.
  const walkStartCheckRef = useRef({ walkKey: "", pending: false });
  useEffect(() => {
    const check = walkStartCheckRef.current;
    if (check.walkKey !== walkKey) {
      check.walkKey = walkKey;
      check.pending = Boolean(walkKey);
    }
    if (!check.pending || !walkStart) {
      return;
    }
    const shownId = params.diffId;
    if (shownId && walkOrder.has(shownId)) {
      check.pending = false;
      return;
    }
    // The pages of the list come in one after the other: the screenshot of
    // the URL, or the journey's first screen, may be in one still to come.
    if (
      !complete &&
      ((shownId && !indices.byId[shownId]) || !firstWalkedLoaded)
    ) {
      return;
    }
    check.pending = false;
    setActiveDiff(walkStart, true);
  }, [
    walkKey,
    walkStart,
    params.diffId,
    walkOrder,
    indices,
    complete,
    firstWalkedLoaded,
    setActiveDiff,
  ]);

  const setGrouping = useEventCallback((next: SnapshotGrouping) => {
    setGroupingPreference(next);
    if (!activeDiff) {
      return;
    }
    // The groups of `next` are only built on the next render, so the one the
    // active diff lands in is named here, the way they will name it.
    const name =
      next === "test"
        ? getTestGroupName(resolveTestIdentity(resolveDiffMetadata(activeDiff)))
        : getDiffListStatus(
            activeDiff,
            reviewState?.diffStatuses[activeDiff.id] ?? null,
            { isSubsetBuild },
          );
    if (name) {
      setToggle(name, true);
    }
    setScrollRequest({ diff: activeDiff, reflowed: true });
  });

  const setDisplay = useEventCallback((next: SnapshotDisplay) => {
    setDisplayPreference(next);
    if (activeDiff) {
      setScrollRequest({ diff: activeDiff, reflowed: true });
    }
  });

  // Read from `groups` rather than through `getDiffGroup`: an event callback
  // only picks up the new render's closure in a layout effect, so during the
  // render that moves a diff to another group it still answers with the group
  // the diff just left. The effect below would then keep the deps it already
  // had, and the new group would stay collapsed until an unrelated render
  // happened to recompute this — the snapshot blinking out of the list for a
  // few frames right after a review is submitted.
  const initialDiffGroup = useMemo(
    () => findDiffGroup(groups, initialDiff),
    [groups, initialDiff],
  );

  const [ready, setReady] = useState(false);
  // A regroup renames the initial diff's group without the diff moving:
  // `setGrouping` opens the active diff's group instead, and the reader may
  // have closed this one since.
  const initialDiffGroupingRef = useRef(grouping);

  useLayoutEffect(() => {
    if (initialDiffGroup?.name) {
      if (initialDiffGroupingRef.current === grouping) {
        toggleGroup(initialDiffGroup.name, true);
      }
      initialDiffGroupingRef.current = grouping;
      // oxlint-disable-next-line react/react-compiler
      setReady(true);
    } else if (complete) {
      setReady(true);
    }
  }, [complete, initialDiffGroup?.name, grouping, toggleGroup]);

  const searchValue = useMemo(
    (): SearchContextValue => ({ search, setSearch }),
    [search, setSearch],
  );

  const searchModeValue = useMemo(
    (): SearchModeContextValue => ({ searchMode, setSearchMode }),
    [searchMode, setSearchMode],
  );

  const hasNoResults = Boolean(
    searchMode &&
    deferredSearch &&
    results.length === 0 &&
    screenshotDiffs.length > 0,
  );

  const value = useMemo(
    (): BuildDiffContextValue => ({
      grouping,
      setGrouping,
      setDisplay,
      groups,
      diffs: sortedDiffs,
      allDiffs: screenshotDiffs,
      expanded,
      toggleGroup,
      isStackCollapsed,
      activeDiff,
      setActiveDiff,
      scrollRequest,
      initialDiff,
      firstDiff,
      ready,
      stats,
      results,
      hasNoResults,
      siblingDiffs,
      ariaDiff,
      isLoading: hasMore,
      isSubsetBuild,
      journeyMode,
      journeys,
      walkedJourneys,
      journeyStepLabels,
    }),
    [
      grouping,
      setGrouping,
      setDisplay,
      groups,
      sortedDiffs,
      screenshotDiffs,
      expanded,
      toggleGroup,
      isStackCollapsed,
      activeDiff,
      setActiveDiff,
      scrollRequest,
      initialDiff,
      firstDiff,
      ready,
      stats,
      results,
      hasNoResults,
      siblingDiffs,
      ariaDiff,
      hasMore,
      isSubsetBuild,
      journeyMode,
      journeys,
      walkedJourneys,
      journeyStepLabels,
    ],
  );

  return (
    <FilterStateContext value={filterState}>
      <SearchModeContext value={searchModeValue}>
        <SearchContext value={searchValue}>
          <JourneyDrawerContext value={drawerValue}>
            <BuildDiffContext value={value}>{children}</BuildDiffContext>
          </JourneyDrawerContext>
        </SearchContext>
      </SearchModeContext>
    </FilterStateContext>
  );
}
