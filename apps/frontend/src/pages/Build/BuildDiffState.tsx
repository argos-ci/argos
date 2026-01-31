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
import { useNavigate } from "react-router-dom";

import {
  checkIsDiffGroupName,
  DIFF_GROUPS,
  type DiffGroup,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";

import { getBuildURL, type BuildParams } from "./BuildParams";
import { EvaluationStatus, useBuildReviewState } from "./BuildReviewState";

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
        }
      }
    }
    compareScreenshot {
      id
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
        }
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
  groups: DiffGroup[];
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
   * The index to start searching from.
   * Default to the active diff index.
   */
  fromIndex?: number;
}

export function useGetNextDiff(
  predicate?: (diff: Diff) => boolean,
  options?: UseGetNextDiffOptions,
) {
  const hasNextDiff = useHasNextDiff();
  const { searchMode } = useSearchModeState();
  const { diffs, activeDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  const fromIndex = options?.fromIndex ?? activeDiffIndex;
  return useEventCallback(() => {
    if (!hasNextDiff) {
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
  const { setActiveDiff } = useBuildDiffState();
  return useEventCallback(() => {
    const previousDiff = getPreviousDiff();
    if (previousDiff) {
      setActiveDiff(previousDiff, true);
    }
  });
}

function useExpandedState(initial: string[]) {
  const [expanded, setExpanded] = useState<string[]>(initial);
  useEffect(() => {
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
): DiffGroup[] {
  const diffByGroups = diffs.reduce<Partial<Record<DiffGroupName, DiffGroup>>>(
    (groups, diff) => {
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
    },
    {},
  );
  return DIFF_GROUPS.map((groupName) => diffByGroups[groupName] ?? null).filter(
    (x) => x !== null,
  );
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

  const filteredDiffs = useMemo(
    () => (searchMode ? results.map((result) => result.item) : screenshotDiffs),
    [screenshotDiffs, results, searchMode],
  );

  const [initialDiffIdParam] = useState(params.diffId);
  const initialDiffId = initialDiffIdParam ?? firstDiffId;
  const paramsRef = useLiveRef(params);

  // Navigate to the initial diff if not already the case.
  useEffect(() => {
    if (!initialDiffIdParam && initialDiffId) {
      navigate(getBuildURL({ ...paramsRef.current, diffId: initialDiffId }), {
        replace: true,
      });
    }
  }, [initialDiffId, initialDiffIdParam, paramsRef, navigate]);

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

  const groups = useMemo(() => {
    return groupDiffs(filteredDiffs, reviewState?.diffStatuses ?? {});
  }, [filteredDiffs, reviewState?.diffStatuses]);

  const getDiffGroup = useEventCallback((diff: Diff | null) => {
    if (!diff) {
      return null;
    }
    const group = groups.find((group) =>
      group.diffs.includes(diff),
    ) as DiffGroup;
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      diffs: filteredDiffs,
      expanded,
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
      filteredDiffs,
      expanded,
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
    <SearchModeContext value={searchModeValue}>
      <SearchContext value={searchValue}>
        <BuildDiffContext value={value}>{children}</BuildDiffContext>
      </SearchContext>
    </SearchModeContext>
  );
}
