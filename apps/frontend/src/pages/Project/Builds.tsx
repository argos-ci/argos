import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import {
  useBackgroundQuery,
  useReadQuery,
  useSuspenseQuery,
  type QueryRef,
} from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import { BoxesIcon } from "lucide-react";
import { useQueryStates } from "nuqs";
import { Heading, Text } from "react-aria-components";
import { useResolvedPath } from "react-router-dom";

import { BuildMergeQueueIndicator } from "@/containers/BuildMergeQueueIndicator";
import { BuildModeIndicator } from "@/containers/BuildModeIndicator";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { BuildTestStatusChip } from "@/containers/BuildTestStatusChip";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { Button, LinkButton } from "@/ui/Button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { List, ListRowLink, ListRowLoader } from "@/ui/List";
import { Time } from "@/ui/Time";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { checkAreDefaultValues } from "@/util/search-params";

import { BuildStatsIndicator } from "../Build/BuildStatsIndicator";
import { NotFound } from "../NotFound";
import { BuildNameFilter, BuildNameFilterParser } from "./BuildNameFilter";
import {
  BuildStatusFilter,
  BuildStatusFilterParser,
} from "./BuildStatusFilter";
import { BuildTypeFilter, BuildTypeFilterParser } from "./BuildTypeFilter";
import { GettingStarted } from "./GettingStarted";
import { useProjectOutletContext } from "./ProjectOutletContext";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectQuery = graphql(`
  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      repository {
        __typename
        id
        url
      }
      buildNames
      ...GettingStarted_Project
    }
  }
`);

type ProjectDocument = DocumentType<typeof ProjectQuery>;
type Project = NonNullable<ProjectDocument["project"]>;

const ProjectBuildsQuery = graphql(`
  query ProjectBuilds_project_Builds(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
    $filters: BuildsFilterInput
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      builds(first: $first, after: $after, filters: $filters) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          number
          createdAt
          name
          branch
          commit
          mode
          mergeQueue
          subset
          stats {
            ...BuildStatsIndicator_BuildStats
          }
          pullRequest {
            id
            ...PullRequestButton_PullRequest
          }
          ...BuildStatusChip_Build
          ...BuildTestStatusChip_Build
        }
      }
    }
  }
`);

type ProjectBuildsDocument = DocumentType<typeof ProjectBuildsQuery>;
type Builds = NonNullable<ProjectBuildsDocument["project"]>["builds"];
type Build = Builds["edges"][0];

function BuildRow({
  build,
  project,
  style,
}: {
  build: Build;
  project: Project;
  style: React.CSSProperties;
}) {
  const resolvedBuild = useResolvedPath(`builds/${build.number}`);
  return (
    <ListRowLink
      href={resolvedBuild.pathname}
      className="flex items-center gap-6 p-4 text-sm"
      style={style}
    >
      <div className="w-28 shrink-0">
        <div className="flex items-center gap-1">
          <BuildModeIndicator mode={build.mode} />
          <div className="tabular-nums">{build.number}</div>
        </div>
        {build.name !== "default" ? (
          <Truncable className="text-low mt-1 text-xs">{build.name}</Truncable>
        ) : null}
      </div>
      <div className="flex w-38 shrink-0 flex-col items-start gap-1">
        <BuildStatusChip build={build} scale="sm" />
      </div>
      <div className="hidden w-28 shrink-0 items-start lg:flex">
        <BuildTestStatusChip build={build} scale="sm" />
      </div>
      <div className="flex grow">
        <div className="hidden lg:flex">
          {build.stats ? (
            <BuildStatsIndicator
              stats={build.stats}
              className="flex-wrap"
              isSubsetBuild={build.subset}
            />
          ) : null}
        </div>
      </div>
      <div className="hidden gap-2 xl:flex xl:w-56 2xl:w-96">
        <div className="w-6.5">
          {build.mergeQueue ? <BuildMergeQueueIndicator /> : null}
        </div>
        {build.pullRequest && (
          <PullRequestButton
            size="small"
            pullRequest={build.pullRequest}
            className="max-w-full"
            target="_blank"
            emulateLink
          />
        )}
      </div>
      <div className="relative hidden w-32 flex-col gap-1 text-xs md:flex">
        {build.branch && (
          <div>
            <Link
              className="inline-flex max-w-full items-center gap-2"
              variant="neutral"
              target="_blank"
              href={
                project.repository
                  ? `${project.repository.url}/tree/${build.branch}`
                  : undefined
              }
            >
              <GitBranchIcon className="size-3 shrink-0" />
              <Truncable>{build.branch}</Truncable>
            </Link>
          </div>
        )}
        <div>
          <Link
            className="inline-flex max-w-full items-center gap-2"
            variant="neutral"
            target="_blank"
            href={
              project.repository
                ? `${project.repository.url}/commit/${build.commit}`
                : undefined
            }
          >
            <GitCommitIcon className="size-3 shrink-0" />
            <span className="truncate">{build.commit.slice(0, 7)}</span>
          </Link>
        </div>
      </div>
      <div
        className="text-low w-24 shrink-0 truncate overflow-hidden text-right text-xs whitespace-nowrap"
        data-visual-test="transparent"
      >
        <Time date={build.createdAt} />
      </div>
    </ListRowLink>
  );
}

function BuildsList(props: {
  builds: Builds;
  project: Project;
  isFetchingMore: boolean;
  isUpdating: boolean;
  fetchNextPage: () => void;
}) {
  const { builds, project, isFetchingMore, isUpdating, fetchNextPage } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = builds.pageInfo;
  const displayCount = builds.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 75,
    getScrollElement: () => parentRef.current,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index === displayCount &&
      !isFetchingMore &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, displayCount, isFetchingMore, hasNextPage, fetchNextPage]);

  return (
    <List
      ref={parentRef}
      className={clsx(
        "absolute max-h-full w-full",
        isUpdating && "animate-pulse",
      )}
      style={{ display: "block" }}
    >
      <div
        className="relative"
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {virtualItems.map((virtualRow) => {
          const build = builds.edges[virtualRow.index];

          if (!build) {
            return (
              <ListRowLoader
                key={`loader-${virtualRow.index}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                Fetching builds...
              </ListRowLoader>
            );
          }
          return (
            <BuildRow
              key={`build-${build.id}`}
              build={build}
              project={project}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          );
        })}
      </div>
    </List>
  );
}

const filtersSchema = {
  name: BuildNameFilterParser,
  type: BuildTypeFilterParser,
  status: BuildStatusFilterParser,
};

function PageContent(props: {
  projectQueryRef: QueryRef<DocumentType<typeof ProjectQuery>>;
  params: ProjectParams;
}) {
  const { projectQueryRef, params } = props;
  const { permissions } = useProjectOutletContext();
  const hasReviewerPermission = permissions.includes(ProjectPermission.Review);
  const [filters, setFilters] = useQueryStates(filtersSchema);
  const hasFilters = !checkAreDefaultValues(filtersSchema, filters);

  const deferredFilters = useDeferredValue(filters);
  const isUpdating = filters !== deferredFilters;
  const filtersVariable = useMemo(() => {
    return {
      name: deferredFilters.name,
      status: Array.from(deferredFilters.status),
      type: Array.from(deferredFilters.type),
    };
  }, [deferredFilters]);
  const { fetchMore, data: projectBuildsData } = useSuspenseQuery(
    ProjectBuildsQuery,
    {
      variables: {
        accountSlug: params.accountSlug,
        projectName: params.projectName,
        filters: filtersVariable,
        after: 0,
        first: 20,
      },
    },
  );

  const {
    data: { project },
  } = useReadQuery(projectQueryRef);

  const builds = projectBuildsData.project?.builds;

  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(builds);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: {
          after: builds.edges.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (
            !prev.project?.builds?.edges ||
            !fetchMoreResult?.project?.builds
          ) {
            return fetchMoreResult;
          }

          return {
            ...prev,
            project: {
              ...prev.project,
              builds: {
                ...prev.project.builds,
                ...fetchMoreResult.project.builds,
                edges: [
                  ...prev.project.builds.edges,
                  ...fetchMoreResult.project.builds.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  if (!project || !builds) {
    return <NotFound />;
  }

  if (builds.pageInfo.totalCount === 0 && !hasFilters) {
    if (hasReviewerPermission) {
      return (
        <PageContainer>
          <GettingStarted project={project} />
        </PageContainer>
      );
    } else {
      return (
        <PageContainer>
          <EmptyState>
            <EmptyStateIcon>
              <BoxesIcon strokeWidth={1} />
            </EmptyStateIcon>
            <Heading>No builds</Heading>
            <Text slot="description">
              There are no builds yet on this project.
            </Text>
            <EmptyStateActions>
              <LinkButton href="/">Back to home</LinkButton>
            </EmptyStateActions>
          </EmptyState>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Builds</Heading>
          <Text slot="headline">
            View all the builds associated with this project.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions>
          <BuildTypeFilter
            value={filters.type}
            onChange={(type) => setFilters({ type })}
          />
          <BuildStatusFilter
            value={filters.status}
            onChange={(status) => setFilters({ status })}
          />
          {project.buildNames.length > 1 && (
            <BuildNameFilter
              buildNames={project.buildNames}
              value={filters.name}
              onChange={(name) => setFilters({ name })}
            />
          )}
        </PageHeaderActions>
      </PageHeader>
      <div className="relative flex-1">
        {hasFilters && builds.pageInfo.totalCount === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <BoxesIcon strokeWidth={1} />
            </EmptyStateIcon>
            <Heading>No builds</Heading>
            <Text slot="description">
              There are no builds matching the filters.
            </Text>
            <EmptyStateActions>
              <Button onPress={() => setFilters(null)}>Reset filters</Button>
            </EmptyStateActions>
          </EmptyState>
        ) : (
          <BuildsList
            project={project}
            builds={builds}
            fetchNextPage={fetchNextPage}
            isFetchingMore={isFetchingMore}
            isUpdating={isUpdating}
          />
        )}
      </div>
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  const [projectQueryRef] = useBackgroundQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });

  return (
    <Page>
      <ProjectTitle params={params}>Builds</ProjectTitle>
      <PageContent projectQueryRef={projectQueryRef} params={params} />
    </Page>
  );
}
