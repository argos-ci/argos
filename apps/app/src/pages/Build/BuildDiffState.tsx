import { useQuery } from "@apollo/client";
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

import type { BuildStats } from "@/containers/Build";
import { graphql } from "@/gql";
import { ScreenshotDiffStatus, TestStatus } from "@/gql/graphql";

import { GROUPS } from "./BuildDiffGroup";
import type { BuildParams } from "./BuildParams";

export interface Diff {
  id: string;
  url?: string | null;
  status: ScreenshotDiffStatus;
  name: string;
  width?: number | null;
  height?: number | null;
  flakyDetected: boolean;
  compareScreenshot?: {
    id: string;
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
  baseScreenshot?: {
    id: string;
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
  test?: {
    id: string;
    status: TestStatus;
    unstable: boolean;
    resolvedDate?: string | null;
    mute: boolean;
    muteUntil?: string | null;
  } | null;
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

const ProjectQuery = graphql(`
  query BuildDiffState_Project(
    $accountSlug: String!
    $projectSlug: String!
    $buildNumber: Int!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectSlug: $projectSlug) {
      id
      build(number: $buildNumber) {
        id
        screenshotDiffs(after: $after, first: $first) {
          pageInfo {
            hasNextPage
          }
          edges {
            id
            status
            url
            name
            width
            height
            flakyDetected
            baseScreenshot {
              id
              url
              width
              height
            }
            compareScreenshot {
              id
              url
              width
              height
            }
            test {
              id
              status
              unstable
              resolvedDate
              mute
              muteUntil
            }
          }
        }
      }
    }
  }
`);

const useDataState = ({
  accountSlug,
  projectSlug,
  buildNumber,
}: {
  accountSlug: string;
  projectSlug: string;
  buildNumber: number;
}) => {
  const { data, loading, error, fetchMore } = useQuery(ProjectQuery, {
    variables: {
      accountSlug,
      projectSlug,
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
          if (!fetchMoreResult?.project?.build?.screenshotDiffs.edges)
            return prev;
          if (!prev?.project?.build?.screenshotDiffs.edges) return prev;

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
  const screenshotDiffs: Diff[] =
    data?.project?.build?.screenshotDiffs.edges ?? [];

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
  const screenshotDiffs = useDataState(params);
  const complete = Boolean(stats && screenshotDiffs.length === stats?.total);
  const firstDiffId = screenshotDiffs[0]?.id ?? null;

  // Initial diff from the URL params or the first diff
  const [initialDiffId, setInitialDiffId] = useState(params.diffId);

  // Set the initial diff id to the first diff id if it's not set
  useEffect(() => {
    if (!params.diffId && firstDiffId) {
      navigate(
        `/${params.accountSlug}/${params.projectSlug}/builds/${params.buildNumber}/${firstDiffId}`,
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
        `/${params.accountSlug}/${params.projectSlug}/builds/${params.buildNumber}/${diff.id}`,
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
      params.accountSlug,
      params.projectSlug,
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
    } else if (complete) {
      setReady(true);
    }
  }, [complete, initialDiffGroup, toggleGroup]);

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
