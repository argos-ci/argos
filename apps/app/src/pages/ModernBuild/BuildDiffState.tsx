import type { BuildStats } from "@/modern/containers/Build";
import { gql, useQuery } from "@apollo/client";
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
import { useNavigate } from "react-router-dom";
import { GROUPS } from "./BuildDiffGroup";
import type { BuildParams } from "./BuildParams";

const LIMIT = 100;

export interface Diff {
  id: string;
  url: string | null;
  status: "added" | "updated" | "removed" | "stable" | "failed";
  name: string;
  compareScreenshot: {
    id: string;
    url: string;
  };
  baseScreenshot: {
    id: string;
    url: string;
  };
}

export interface DiffGroup {
  name: "failure" | "changed" | "added" | "removed" | "unchanged";
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

interface BuildDiffContextValue {
  diffs: Diff[];
  groups: DiffGroup[];
  expanded: DiffGroup["name"][];
  toggleGroup: (name: DiffGroup["name"], value?: boolean) => void;
  activeDiff: Diff | null;
  setActiveDiff: (diff: Diff, scroll?: boolean) => void;
  scrolledDiff: Diff | null;
  initialDiff: Diff | null;
  ready: boolean;
  stats: BuildStats | null;
}

const BuildDiffContext = createContext<BuildDiffContextValue | null>(null);

export const useBuildDiffState = () => {
  const context = useContext(BuildDiffContext);
  if (context === null) {
    throw new Error(
      "useBuildDiffContext must be used within a BuildDiffProvider"
    );
  }
  return context;
};

const useExpandedState = () => {
  const [expanded, setExpanded] = useState<DiffGroup["name"][]>([
    "failure",
    "changed",
  ]);
  const toggleGroup = useCallback(
    (name: DiffGroup["name"], value?: boolean) => {
      setExpanded((expanded) => {
        const included = expanded.includes(name);
        const expand = value !== undefined ? value : !included;
        if (expand && included) return expanded;
        if (!expand && !included) return expanded;
        return expand
          ? [...expanded, name]
          : expanded.filter((n) => n !== name);
      });
    },
    []
  );

  return { expanded, toggleGroup };
};

const ScreenshotDiffQuery = gql`
  query ScreenshotDiffQuery(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
    $offset: Int!
    $limit: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      build(number: $buildNumber) {
        id
        screenshotDiffs(offset: $offset, limit: $limit) {
          pageInfo {
            hasNextPage
          }
          edges {
            id
            status
            url
            name
            baseScreenshot {
              id
              url
            }
            compareScreenshot {
              id
              url
            }
          }
        }
      }
    }
  }
`;

const useDataState = ({
  ownerLogin,
  repositoryName,
  buildNumber,
}: {
  ownerLogin: string;
  repositoryName: string;
  buildNumber: number;
}) => {
  const { data, loading, error, fetchMore } = useQuery<
    any,
    {
      ownerLogin: string;
      repositoryName: string;
      buildNumber: number;
      offset: number;
      limit: number;
    }
  >(ScreenshotDiffQuery, {
    variables: {
      ownerLogin,
      repositoryName,
      buildNumber,
      offset: 0,
      limit: LIMIT,
    },
  });
  if (error) {
    throw error;
  }
  useEffect(() => {
    if (
      !loading &&
      data?.repository?.build?.screenshotDiffs?.pageInfo?.hasNextPage
    ) {
      fetchMore({
        variables: {
          offset: data.repository.build.screenshotDiffs.edges.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          return {
            ...prev,
            repository: {
              ...prev.repository,
              build: {
                ...prev.repository.build,
                screenshotDiffs: {
                  ...fetchMoreResult.repository.build.screenshotDiffs,
                  edges: [
                    ...prev.repository.build.screenshotDiffs.edges,
                    ...fetchMoreResult.repository.build.screenshotDiffs.edges,
                  ],
                },
              },
            },
          };
        },
      });
    }
  }, [data, loading, fetchMore]);
  const screenshotDiffs: Diff[] =
    data?.repository?.build?.screenshotDiffs.edges ?? [];

  return {
    screenshotDiffs,
    complete: Boolean(
      data && !data?.repository?.build?.screenshotDiffs?.pageInfo?.hasNextPage
    ),
  };
};

const hydrateGroups = (groups: DiffGroup[], screenshotDiffs: Diff[]) => {
  let index = 0;
  return groups.map((group) => {
    return {
      ...group,
      diffs: group.diffs.map((_) => {
        const diff = screenshotDiffs[index] ?? null;
        index++;
        return diff;
      }),
    };
  });
};

export interface BuildDiffProviderProps {
  children: React.ReactNode;
  stats: BuildStats | null;
  params: BuildParams;
}

export const BuildDiffProvider = ({
  children,
  stats,
  params,
}: BuildDiffProviderProps) => {
  const navigate = useNavigate();
  const { expanded, toggleGroup } = useExpandedState();
  const { screenshotDiffs, complete } = useDataState(params);
  const firstDiffId = screenshotDiffs[0]?.id ?? null;

  // Initial diff from the URL params or the first diff
  const [initialDiffId, setInitialDiffId] = useState(params.diffId);

  // Set the initial diff id to the first diff id if it's not set
  useEffect(() => {
    if (!params.diffId && firstDiffId) {
      navigate(
        `/${params.ownerLogin}/${params.repositoryName}/builds/${params.buildNumber}/modern/${firstDiffId}`,
        { replace: true }
      );
      setInitialDiffId(firstDiffId);
    }
  }, [params, firstDiffId, navigate]);

  // Get the initial diff from the screenshot diffs
  const initialDiff = useMemo(
    () => screenshotDiffs.find((diff) => diff.id === initialDiffId) ?? null,
    [initialDiffId, screenshotDiffs]
  );

  // Get the active diff from the screenshot diffs
  const activeDiff = useMemo(
    () => screenshotDiffs.find((diff) => diff.id === params.diffId) ?? null,
    [params.diffId, screenshotDiffs]
  );

  const [scrolledDiff, setScrolledDiff] = useState<Diff | null>(null);

  const statsGroups = useMemo(
    () => (stats ? getGroupsFromStats(stats) : []),
    [stats]
  );

  const hydratedGroups = useMemo(
    () => hydrateGroups(statsGroups, screenshotDiffs),
    [statsGroups, screenshotDiffs]
  );

  const hydratedGroupsRef = useRef(hydratedGroups);
  hydratedGroupsRef.current = hydratedGroups;

  const getDiffGroup = useCallback((diff: Diff | null) => {
    if (!diff) return null;
    const group = hydratedGroupsRef.current.find((group) =>
      group.diffs.includes(diff)
    ) as DiffGroup;
    return group;
  }, []);

  const setActiveDiff = useCallback(
    (diff: Diff, scroll?: boolean) => {
      navigate(
        `/${params.ownerLogin}/${params.repositoryName}/builds/${params.buildNumber}/modern/${diff.id}`,
        { replace: true }
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
      params.ownerLogin,
      params.repositoryName,
      getDiffGroup,
      toggleGroup,
    ]
  );

  const initialDiffGroup = getDiffGroup(initialDiff);

  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (initialDiffGroup) {
      toggleGroup(initialDiffGroup.name, true);
      setReady(true);
    }
  }, [initialDiffGroup, toggleGroup]);

  useLayoutEffect(() => {
    if (complete) {
      setReady(true);
    }
  }, [complete]);

  const value = useMemo(
    (): BuildDiffContextValue => ({
      groups: hydratedGroups,
      diffs: screenshotDiffs,
      expanded,
      toggleGroup,
      activeDiff,
      setActiveDiff,
      scrolledDiff,
      initialDiff,
      ready,
      stats,
    }),
    [
      hydratedGroups,
      screenshotDiffs,
      expanded,
      toggleGroup,
      activeDiff,
      setActiveDiff,
      scrolledDiff,
      initialDiff,
      ready,
      stats,
    ]
  );
  return (
    <BuildDiffContext.Provider value={value}>
      {children}
    </BuildDiffContext.Provider>
  );
};
