import {
  createContext,
  startTransition,
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ResultOf } from "@graphql-typed-document-node/core";
import { MatchData, Searcher } from "fast-fuzzy";
import { useNavigate } from "react-router";

import {
  checkIsDiffGroupName,
  DIFF_GROUPS,
  type DiffGroup,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import {
  compareSteps,
  getCaptureIndex,
  getStepKey,
  getVariantLabel,
  resolveFlowIdentity,
  type FlowIdentity,
} from "@/util/flow-model";

import { useStoredOrders } from "../Project/Flows/util";
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
  useCreateFilterState,
} from "./metadata/filters/util";
import { resolveDiffMetadata } from "./sidebar/metadata/utils";

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

type BuildDiffContextValue = {
  diffs: Diff[];
  allDiffs: Diff[];
  groups: DiffGroup<Diff>[];
  expanded: string[];
  toggleGroup: (name: string, value?: boolean) => void;
  activeDiff: Diff | null;
  setActiveDiff: (diff: Diff, scroll?: boolean) => void;
  scrolledDiff: Diff | null;
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
  const { diffs, activeDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  const fromIndex = options?.fromIndex ?? activeDiffIndex;
  return useEventCallback(() => {
    if (fromIndex >= diffs.length - 1) {
      return null;
    }

    const isGroupExpanded =
      !activeDiff?.group || expanded.includes(activeDiff.group);

    if ((isGroupExpanded || searchMode) && !predicate) {
      return diffs[fromIndex + 1] ?? null;
    }

    const offsetIndex = fromIndex + 1;
    const nextDiffIndex = diffs.slice(offsetIndex).findIndex((diff) => {
      if (!isGroupExpanded && !searchMode && diff.group === activeDiff.group) {
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
  const { diffs, expanded } = useBuildDiffState();
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

    const isGroupExpanded =
      !previousDiff.group || expanded.includes(previousDiff.group);

    if (isGroupExpanded || searchMode) {
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
  const { setActiveDiff, activeDiff } = useBuildDiffState();
  const params = useBuildParams();
  const navigate = useNavigate();
  return useEventCallback(() => {
    const previousDiff = getPreviousDiff();
    if (previousDiff) {
      setActiveDiff(previousDiff, true);
      return;
    }
    // From the first diff, going up returns to the build overview.
    if (activeDiff && params) {
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

function useExpandedState(initial: string[]) {
  const [expanded, setExpanded] = useState<string[]>(initial);
  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setExpanded(initial);
  }, [initial]);
  const toggleGroup = useCallback((name: string, value?: boolean) => {
    setExpanded((expanded) => {
      const included = expanded.includes(name);
      const expand = value !== undefined ? value : !included;
      if (expand && included) {
        return expanded;
      }
      if (!expand && !included) {
        return expanded;
      }
      return expand ? [...expanded, name] : expanded.filter((n) => n !== name);
    });
  }, []);

  return useMemo(() => ({ expanded, toggleGroup }), [expanded, toggleGroup]);
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

function groupDiffs(
  diffs: Diff[],
  reviewStatuses: Record<string, EvaluationStatus>,
): DiffGroup<Diff>[] {
  const diffByGroups = diffs.reduce<
    Partial<Record<DiffGroupName, DiffGroup<Diff>>>
  >((groups, diff) => {
    const reviewStatus = reviewStatuses[diff.id] ?? EvaluationStatus.Pending;
    const diffGroupName =
      reviewStatus === EvaluationStatus.Pending ? diff.status : reviewStatus;
    if (checkIsDiffGroupName(diffGroupName)) {
      const group = groups[diffGroupName] ?? {
        name: diffGroupName,
        diffs: [],
      };
      groups[diffGroupName] = group;
      group.diffs.push(diff);
    }
    return groups;
  }, {});
  return DIFF_GROUPS.map((groupName) => diffByGroups[groupName] ?? null).filter(
    (x) => x !== null,
  );
}

/** Sidebar grouping mode: by review status (default) or by user flow. */
export type SidebarGrouping = "status" | "flow";

const SIDEBAR_GROUPING_STORAGE_KEY = "preferences.build.sidebar-grouping";

function readStoredSidebarGrouping(): SidebarGrouping {
  return localStorage.getItem(SIDEBAR_GROUPING_STORAGE_KEY) === "flow"
    ? "flow"
    : "status";
}

type SidebarGroupingContextValue = {
  grouping: SidebarGrouping;
  setGrouping: (grouping: SidebarGrouping) => void;
};

const SidebarGroupingContext =
  createContext<SidebarGroupingContextValue | null>(null);

export function useSidebarGrouping() {
  const context = use(SidebarGroupingContext);
  invariant(
    context,
    "useSidebarGrouping must be used within a BuildDiffProvider",
  );
  return context;
}

const ATTENTION_STATUSES: string[] = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
];

/**
 * Groups diffs by user flow (see `@/util/flow-model`): one group per test
 * with screenshots, diffs ordered by step (curated order, then capture
 * index, then alphabetical) so reviewing follows the journey. Screenshots
 * without flow information gather in a trailing group.
 */
function groupDiffsByFlow(
  diffs: Diff[],
  orders: Record<string, string[]>,
): DiffGroup<Diff>[] {
  const byKey = new Map<string, { identity: FlowIdentity; diffs: Diff[] }>();
  const others: Diff[] = [];
  for (const diff of diffs) {
    const metadata = resolveDiffMetadata(diff);
    const identity = resolveFlowIdentity({ name: diff.name, metadata });
    if (!identity) {
      others.push(diff);
      continue;
    }
    const entry = byKey.get(identity.key) ?? { identity, diffs: [] };
    byKey.set(identity.key, entry);
    entry.diffs.push(diff);
  }
  const toStep = (diff: Diff) => ({
    key: getStepKey(diff.name),
    captureIndex: getCaptureIndex({
      name: diff.name,
      metadata: resolveDiffMetadata(diff),
    }),
  });
  const changedCount = (diffs: Diff[]) =>
    diffs.filter((diff) => ATTENTION_STATUSES.includes(diff.status)).length;
  const groups: DiffGroup<Diff>[] = [...byKey.values()]
    .map(({ identity, diffs }) => {
      const storedOrder = orders[identity.key];
      const sorted = diffs.toSorted(
        (a, b) =>
          compareSteps(toStep(a), toStep(b), storedOrder) ||
          getVariantLabel(a.name).localeCompare(getVariantLabel(b.name)) ||
          a.name.localeCompare(b.name),
      );
      return {
        name: `flow:${identity.key}`,
        diffs: sorted,
        flow: { ...identity, changedCount: changedCount(diffs) },
      };
    })
    .toSorted(
      (a, b) =>
        Number((b.flow?.changedCount ?? 0) > 0) -
          Number((a.flow?.changedCount ?? 0) > 0) ||
        (a.flow?.key ?? "").localeCompare(b.flow?.key ?? ""),
    );
  if (others.length > 0) {
    groups.push({
      name: "flow:others",
      diffs: others.toSorted((a, b) => a.name.localeCompare(b.name)),
      flow: {
        key: "",
        prefix: "",
        title: "Other screenshots",
        changedCount: changedCount(others),
      },
    });
  }
  return groups;
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
  }
`);

type BuildStats = DocumentType<typeof _BuildDiffStateFragment>["stats"];

const INITIAL_SEARCH_EXPANDED = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
  ScreenshotDiffStatus.Unchanged,
  ScreenshotDiffStatus.RetryFailure,
];

const INITIAL_SUBSET_EXPANDED = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
];

const INITIAL_EXPANDED = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
];

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
  const expandedState = useExpandedState(
    build?.subset ? INITIAL_SUBSET_EXPANDED : INITIAL_EXPANDED,
  );
  const searchExpandedState = useExpandedState(INITIAL_SEARCH_EXPANDED);
  const { expanded, toggleGroup } = searchMode
    ? searchExpandedState
    : expandedState;

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
  const firstDiff = screenshotDiffs[0] ?? null;
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

  const filterState = useCreateFilterState(screenshotDiffs);

  const filteredDiffs = useMemo(() => {
    let diffs = searchMode
      ? results.map((result) => result.item)
      : screenshotDiffs;
    if (filterState.active.size > 0) {
      diffs = diffs.filter((diff) =>
        diffMatchesFilters(diff, filterState.active),
      );
    }
    return diffs;
  }, [screenshotDiffs, results, searchMode, filterState.active]);

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

  const [scrolledDiff, setScrolledDiff] = useState<Diff | null>(null);

  const [grouping, setGroupingState] = useState<SidebarGrouping>(
    readStoredSidebarGrouping,
  );
  const setGrouping = useCallback((value: SidebarGrouping) => {
    localStorage.setItem(SIDEBAR_GROUPING_STORAGE_KEY, value);
    setGroupingState(value);
  }, []);
  const groupingValue = useMemo(
    (): SidebarGroupingContextValue => ({ grouping, setGrouping }),
    [grouping, setGrouping],
  );
  const { orders } = useStoredOrders(params);

  const groups = useMemo(() => {
    if (grouping === "flow") {
      return groupDiffsByFlow(filteredDiffs, orders);
    }
    return groupDiffs(filteredDiffs, reviewState?.diffStatuses ?? {});
  }, [grouping, orders, filteredDiffs, reviewState?.diffStatuses]);

  // Flow groups have no collapsed state: the journey always reads in full.
  const effectiveExpanded = useMemo(
    () => (grouping === "flow" ? groups.map((group) => group.name) : expanded),
    [grouping, groups, expanded],
  );

  const sortedDiffs = useMemo(() => {
    return groups.flatMap((group) => group.diffs.filter((x) => x !== null));
  }, [groups]);

  const getDiffGroup = useEventCallback((diff: Diff | null) => {
    if (!diff) {
      return null;
    }
    const group = groups.find((group) =>
      group.diffs.includes(diff),
    ) as DiffGroup<Diff>;
    return group;
  });

  const setActiveDiff = useEventCallback((diff: Diff, scroll?: boolean) => {
    navigate(
      getBuildURL({
        accountSlug: params.accountSlug,
        buildNumber: params.buildNumber,
        projectName: params.projectName,
        diffId: diff.id,
      }),
      { replace: true },
    );

    if (scroll) {
      startTransition(() => {
        setScrolledDiff(diff);
        const group = getDiffGroup(diff)!;
        toggleGroup(group.name, true);
      });
    }
  });

  const initialDiffGroup = getDiffGroup(initialDiff);

  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (initialDiffGroup?.name) {
      toggleGroup(initialDiffGroup.name, true);
      // oxlint-disable-next-line react/react-compiler
      setReady(true);
    } else if (complete) {
      setReady(true);
    }
  }, [complete, initialDiffGroup?.name, toggleGroup]);

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

  const isSubsetBuild = build?.subset ?? false;

  const value = useMemo(
    (): BuildDiffContextValue => ({
      groups,
      diffs: sortedDiffs,
      allDiffs: screenshotDiffs,
      expanded: effectiveExpanded,
      toggleGroup,
      activeDiff,
      setActiveDiff,
      scrolledDiff,
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
    }),
    [
      groups,
      sortedDiffs,
      screenshotDiffs,
      effectiveExpanded,
      toggleGroup,
      activeDiff,
      setActiveDiff,
      scrolledDiff,
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
    ],
  );

  return (
    <FilterStateContext value={filterState}>
      <SearchModeContext value={searchModeValue}>
        <SearchContext value={searchValue}>
          <SidebarGroupingContext value={groupingValue}>
            <BuildDiffContext value={value}>{children}</BuildDiffContext>
          </SidebarGroupingContext>
        </SearchContext>
      </SearchModeContext>
    </FilterStateContext>
  );
}
