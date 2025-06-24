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
import { invariant } from "@argos/util/invariant";
import { ResultOf } from "@graphql-typed-document-node/core";
import { MatchData, Searcher } from "fast-fuzzy";
import { useNavigate } from "react-router-dom";

import { useSafeQuery } from "@/containers/Apollo";
import { DIFF_GROUPS, type DiffGroup } from "@/containers/Build/BuildDiffGroup";
import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";

import { getBuildURL, type BuildParams } from "./BuildParams";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScreenshotDiffFragment = graphql(`
  fragment BuildDiffState_ScreenshotDiff on ScreenshotDiff {
    id
    status
    url
    name
    variantKey
    changeId
    width
    height
    group
    threshold
    baseScreenshot {
      id
      url
      originalUrl
      width
      height
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
          }
          retry
          retries
          repeat
        }
      }
    }
    compareScreenshot {
      id
      url
      originalUrl
      width
      height
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
          }
          retry
          retries
          repeat
        }
      }
      playwrightTraceUrl
    }
    ...BuildDiffDetail_ScreenshotDiff
  }
`);

export type Diff = ResultOf<typeof ScreenshotDiffFragment>;

function createDiffs(count: number): null[] {
  return Array.from({ length: count }, () => null);
}

function getGroupsFromStats(stats: NonNullable<BuildStats>): DiffGroup[] {
  return DIFF_GROUPS.map((group) => ({
    name: group,
    diffs: createDiffs(stats[group]),
  }));
}

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
   * Sibling diffs are diffs that have the same base name.
   * This can be used to navigate between diffs that are similar.
   */
  siblingDiffs: Diff[];
};

const BuildDiffContext = createContext<BuildDiffContextValue | null>(null);

export function checkCanBeReviewed(screenshotDiffStatus: ScreenshotDiffStatus) {
  return (
    screenshotDiffStatus === ScreenshotDiffStatus.Added ||
    screenshotDiffStatus === ScreenshotDiffStatus.Removed ||
    screenshotDiffStatus === ScreenshotDiffStatus.Changed
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

export function useGetNextDiff(predicate?: (diff: Diff) => boolean) {
  const hasNextDiff = useHasNextDiff();
  const { searchMode } = useSearchModeState();
  const { diffs, activeDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  return useEventCallback(() => {
    if (!hasNextDiff) {
      return null;
    }

    const isGroupExpanded =
      !activeDiff?.group || expanded.includes(activeDiff.group);

    if ((isGroupExpanded || searchMode) && !predicate) {
      return diffs[activeDiffIndex + 1] ?? null;
    }

    const offsetIndex = activeDiffIndex + 1;
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

function useDataState({
  accountSlug,
  projectName,
  buildNumber,
}: {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
}) {
  const { data, loading, fetchMore } = useSafeQuery(ProjectQuery, {
    variables: {
      accountSlug,
      projectName,
      buildNumber,
      after: 0,
      first: 20,
    },
  });
  useEffect(() => {
    if (
      !loading &&
      data?.project?.build?.screenshotDiffs?.pageInfo?.hasNextPage
    ) {
      fetchMore({
        variables: {
          after: data.project.build.screenshotDiffs.edges.length,
          first: 100,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.project?.build?.screenshotDiffs.edges) {
            return prev;
          }
          if (!prev?.project?.build?.screenshotDiffs.edges) {
            return prev;
          }

          return {
            ...prev,
            project: {
              ...prev.project,
              build: {
                ...prev.project.build,
                screenshotDiffs: {
                  ...fetchMoreResult.project.build.screenshotDiffs,
                  edges: [
                    ...prev.project.build.screenshotDiffs.edges,
                    ...fetchMoreResult.project.build.screenshotDiffs.edges,
                  ],
                },
              },
            },
          };
        },
      });
    }
  }, [data, loading, fetchMore]);
  const screenshotDiffs = (data?.project?.build?.screenshotDiffs.edges ??
    []) as Diff[];
  return screenshotDiffs;
}

function hydrateGroups(groups: DiffGroup[], screenshotDiffs: Diff[]) {
  let index = 0;
  return groups.map((group) => {
    return {
      ...group,
      diffs: group.diffs.map(() => {
        const diff = screenshotDiffs[index] ?? null;
        index++;
        return diff;
      }),
    };
  });
}

function checkIsGroupDiffStatus(
  value: unknown,
): value is (typeof DIFF_GROUPS)[number] {
  return DIFF_GROUPS.includes(value as (typeof DIFF_GROUPS)[number]);
}

function groupDiffs(diffs: Diff[]): DiffGroup[] {
  return diffs.reduce<DiffGroup[]>((groups, diff) => {
    const group = groups.find((group) => group.name === diff.status);
    if (group) {
      group.diffs.push(diff);
    } else if (checkIsGroupDiffStatus(diff.status)) {
      groups.push({
        name: diff.status,
        diffs: [diff],
      });
    }
    return groups;
  }, [] as DiffGroup[]);
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

export function BuildDiffProvider(props: {
  children: React.ReactNode;
  build: DocumentType<typeof _BuildDiffStateFragment> | null;
  params: BuildParams;
}) {
  const { children, params, build } = props;
  const stats = build?.stats ?? null;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [searchMode, setSearchMode] = useState(false);
  const navigate = useNavigate();
  const expandedState = useExpandedState([
    ScreenshotDiffStatus.Failure,
    ScreenshotDiffStatus.Changed,
    ScreenshotDiffStatus.Added,
    ScreenshotDiffStatus.Removed,
  ]);
  const searchExpandedState = useExpandedState([
    ScreenshotDiffStatus.Failure,
    ScreenshotDiffStatus.Changed,
    ScreenshotDiffStatus.Added,
    ScreenshotDiffStatus.Removed,
    ScreenshotDiffStatus.Unchanged,
    ScreenshotDiffStatus.RetryFailure,
  ]);
  const { expanded, toggleGroup } = searchMode
    ? searchExpandedState
    : expandedState;
  const screenshotDiffs = useDataState(params);
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

  const results = useMemo(() => {
    if (!searchMode) {
      return [];
    }
    return searcher.search(deferredSearch);
  }, [searchMode, searcher, deferredSearch]);

  const filteredDiffs = useMemo(() => {
    if (!searchMode) {
      return screenshotDiffs;
    }
    return results.map((result) => {
      return result.item;
    });
  }, [screenshotDiffs, results, searchMode]);

  // Initial diff from the URL params or the first diff
  const [initialDiffId, setInitialDiffId] = useState(params.diffId);

  // Set the initial diff id to the first diff id if it's not set
  useEffect(() => {
    if (!params.diffId && firstDiffId) {
      navigate(getBuildURL({ ...params, diffId: firstDiffId }), {
        replace: true,
      });
      setInitialDiffId(firstDiffId);
    }
  }, [params, firstDiffId, navigate]);

  // Get the initial diff from the screenshot diffs
  const initialDiff = useMemo(
    () => screenshotDiffs.find((diff) => diff.id === initialDiffId) ?? null,
    [initialDiffId, screenshotDiffs],
  );

  // Get the active diff from the screenshot diffs
  const activeDiff = useMemo(
    () => screenshotDiffs.find((diff) => diff.id === params.diffId) ?? null,
    [params.diffId, screenshotDiffs],
  );

  const siblingDiffs = useMemo(
    () =>
      activeDiff
        ? screenshotDiffs.filter(
            (diff) => diff.variantKey === activeDiff.variantKey,
          )
        : [],
    [activeDiff, screenshotDiffs],
  );

  const [scrolledDiff, setScrolledDiff] = useState<Diff | null>(null);

  const statsGroups = useMemo(
    () => (stats ? getGroupsFromStats(stats) : []),
    [stats],
  );

  const groups = useMemo(() => {
    if (searchMode) {
      return groupDiffs(filteredDiffs);
    }
    return hydrateGroups(statsGroups, filteredDiffs);
  }, [statsGroups, filteredDiffs, searchMode]);

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const getDiffGroup = useCallback((diff: Diff | null) => {
    if (!diff) {
      return null;
    }
    const group = groupsRef.current.find((group) =>
      group.diffs.includes(diff),
    ) as DiffGroup;
    return group;
  }, []);

  const setActiveDiff = useCallback(
    (diff: Diff, scroll?: boolean) => {
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
    },
    [
      navigate,
      params.buildNumber,
      params.accountSlug,
      params.projectName,
      getDiffGroup,
      toggleGroup,
    ],
  );

  const initialDiffGroup = getDiffGroup(initialDiff);

  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (initialDiffGroup) {
      toggleGroup(initialDiffGroup.name, true);
      setReady(true);
    } else if (complete) {
      setReady(true);
    }
  }, [complete, initialDiffGroup, toggleGroup, initialDiff]);

  const searchValue = useMemo(
    (): SearchContextValue => ({
      search,
      setSearch,
    }),
    [search, setSearch],
  );

  const searchModeValue = useMemo(
    (): SearchModeContextValue => ({
      searchMode,
      setSearchMode,
    }),
    [searchMode, setSearchMode],
  );

  const hasNoResults = Boolean(
    searchMode && search && !results.length && screenshotDiffs.length > 0,
  );

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
