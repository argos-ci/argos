import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { ResultOf } from "@graphql-typed-document-node/core";
import { MatchData, Searcher } from "fast-fuzzy";
import { useNavigate } from "react-router-dom";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";

import { GROUPS } from "./BuildDiffGroup";
import type { BuildParams } from "./BuildParams";

const ScreenshotDiffFragment = graphql(`
  fragment BuildDiffState_ScreenshotDiff on ScreenshotDiff {
    id
    status
    url
    name
    width
    height
    group
    baseScreenshot {
      id
      url
      width
      height
      metadata {
        url
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
        }
      }
    }
    compareScreenshot {
      id
      url
      width
      height
      metadata {
        url
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
        }
      }
      playwrightTraceUrl
    }
  }
`);

export type Diff = ResultOf<typeof ScreenshotDiffFragment>;

export interface DiffGroup {
  name:
    | ScreenshotDiffStatus.Failure
    | ScreenshotDiffStatus.Changed
    | ScreenshotDiffStatus.Added
    | ScreenshotDiffStatus.Removed
    | ScreenshotDiffStatus.Unchanged
    | ScreenshotDiffStatus.RetryFailure;
  diffs: (Diff | null)[];
}

const createDiffs = (count: number): null[] => {
  return Array.from({ length: count }, () => null);
};

const getGroupsFromStats = (stats: BuildStats): DiffGroup[] => {
  return GROUPS.map((group) => ({
    name: group,
    diffs: createDiffs(stats[group]),
  }));
};

export type DiffResult = MatchData<Diff>;

type BuildDiffContextValue = {
  diffs: Diff[];
  totalDiffCount: number;
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
};

const BuildDiffContext = createContext<BuildDiffContextValue | null>(null);

export function checkCanBeReviewed(screenshotDiffStatus: ScreenshotDiffStatus) {
  return (
    screenshotDiffStatus === ScreenshotDiffStatus.Added ||
    screenshotDiffStatus === ScreenshotDiffStatus.Removed ||
    screenshotDiffStatus === ScreenshotDiffStatus.Changed
  );
}

export const useBuildDiffState = () => {
  const context = useContext(BuildDiffContext);
  invariant(
    context,
    "useBuildDiffState must be used within a BuildDiffProvider",
  );
  return context;
};

function useActiveDiffIndex() {
  const { diffs, activeDiff } = useBuildDiffState();
  return activeDiff ? diffs.indexOf(activeDiff) : -1;
}

export function useHasNextDiff() {
  const { diffs } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  return activeDiffIndex < diffs.length;
}

export function useGoToNextDiff() {
  const { diffs, activeDiff, setActiveDiff, expanded } = useBuildDiffState();
  const hasNextDiff = useHasNextDiff();
  const activeDiffIndex = useActiveDiffIndex();
  const goToNextDiff = useEventCallback(() => {
    if (!hasNextDiff) {
      return;
    }

    const isGroupExpanded =
      !activeDiff?.group || expanded.includes(activeDiff.group);
    if (isGroupExpanded) {
      const nextDiff = diffs[activeDiffIndex + 1];
      if (nextDiff) {
        setActiveDiff(nextDiff, true);
      }
      return;
    }

    const offsetIndex = activeDiffIndex + 1;
    const nextDiffIndex = diffs
      .slice(offsetIndex)
      .findIndex((diff) => diff.group !== activeDiff.group);
    if (nextDiffIndex !== -1) {
      const nextDiff = diffs[nextDiffIndex + offsetIndex];
      if (nextDiff) {
        setActiveDiff(nextDiff, true);
      }
    }
  });
  return goToNextDiff;
}

export function useHasPreviousDiff() {
  const activeDiffIndex = useActiveDiffIndex();
  return activeDiffIndex > 0;
}

export function useGoToPreviousDiff() {
  const { diffs, setActiveDiff, expanded } = useBuildDiffState();
  const activeDiffIndex = useActiveDiffIndex();
  const hasPreviousDiff = useHasPreviousDiff();
  const goToPreviousDiff = useEventCallback(() => {
    if (!hasPreviousDiff) {
      return;
    }

    const previousDiffIndex = activeDiffIndex - 1;
    const previousDiff = diffs[previousDiffIndex];
    if (!previousDiff) {
      return;
    }

    const isGroupExpanded =
      !previousDiff.group || expanded.includes(previousDiff.group);
    if (isGroupExpanded) {
      setActiveDiff(previousDiff, true);
      return;
    }

    const newDiffIndex = diffs
      .slice(0, previousDiffIndex)
      .findIndex((diff) => diff.group === previousDiff.group);
    if (newDiffIndex !== -1) {
      const newDiff = diffs[newDiffIndex];
      if (newDiff) {
        setActiveDiff(newDiff, true);
      }
    }
  });
  return goToPreviousDiff;
}

const useExpandedState = (initial: string[]) => {
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
};

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

const useDataState = ({
  accountSlug,
  projectName,
  buildNumber,
}: {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
}) => {
  const { data, loading, error, fetchMore } = useQuery(ProjectQuery, {
    variables: {
      accountSlug,
      projectName,
      buildNumber,
      after: 0,
      first: 20,
    },
  });
  if (error) {
    throw error;
  }
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
};

const hydrateGroups = (groups: DiffGroup[], screenshotDiffs: Diff[]) => {
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
};

function checkIsGroupDiffStatus(
  value: unknown,
): value is (typeof GROUPS)[number] {
  return GROUPS.includes(value as (typeof GROUPS)[number]);
}

const groupDiffs = (diffs: Diff[]): DiffGroup[] => {
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
};

type SearchModeContextValue = {
  searchMode: boolean;
  setSearchMode: (enabled: boolean) => void;
};

const SearchModeContext = createContext<SearchModeContextValue | null>(null);

export const useSearchModeState = () => {
  const context = useContext(SearchModeContext);
  invariant(
    context,
    "useSearchModeState must be used within a BuildDiffProvider",
  );
  return context;
};

type SearchContextValue = {
  search: string;
  setSearch: (search: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export const useSearchState = () => {
  const context = useContext(SearchContext);
  invariant(context, "useSearchState must be used within a BuildDiffProvider");
  return context;
};

const BuildDiffStateFragment = graphql(`
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

type BuildStats = DocumentType<typeof BuildDiffStateFragment>["stats"];

export const BuildDiffProvider = (props: {
  children: React.ReactNode;
  build: FragmentType<typeof BuildDiffStateFragment> | null;
  params: BuildParams;
}) => {
  const { children, params } = props;
  const build = useFragment(BuildDiffStateFragment, props.build);
  const stats = build?.stats ?? null;
  const [search, setSearch] = useState("");
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
    return searcher.search(search);
  }, [searchMode, searcher, search]);

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
      navigate(
        `/${params.accountSlug}/${params.projectName}/builds/${params.buildNumber}/${firstDiffId}`,
        { replace: true },
      );
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
        `/${params.accountSlug}/${params.projectName}/builds/${params.buildNumber}/${diff.id}`,
        { replace: true },
      );
      if (scroll) {
        setScrolledDiff(diff);
        const group = getDiffGroup(diff)!;
        toggleGroup(group.name, true);
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
      totalDiffCount: screenshotDiffs.length,
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
      screenshotDiffs.length,
    ],
  );
  return (
    <SearchModeContext.Provider value={searchModeValue}>
      <SearchContext.Provider value={searchValue}>
        <BuildDiffContext.Provider value={value}>
          {children}
        </BuildDiffContext.Provider>
      </SearchContext.Provider>
    </SearchModeContext.Provider>
  );
};
