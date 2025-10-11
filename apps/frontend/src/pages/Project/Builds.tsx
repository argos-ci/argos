import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@apollo/client/react";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import { BoxesIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useParams, useResolvedPath, useSearchParams } from "react-router-dom";

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
import { List, ListRowLink, ListRowLoader } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";
import { Time } from "@/ui/Time";
import { Truncable } from "@/ui/Truncable";

import { BuildStatsIndicator } from "../Build/BuildStatsIndicator";
import { NotFound } from "../NotFound";
import { BuildNameFilter, useBuildNameFilterState } from "./BuildNameFilter";
import {
  BuildStatusFilter,
  useBuildStatusFilterState,
} from "./BuildStatusFilter";
import { BuildTypeFilter, useBuildTypeFilterState } from "./BuildTypeFilter";
import { GettingStarted } from "./GettingStarted";
import { useProjectOutletContext } from "./ProjectOutletContext";

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

function FakeLink({
  ref,
  className,
  href,
  ...props
}: React.ComponentPropsWithRef<"div"> & { href: string | undefined }) {
  if (!href) {
    return <div ref={ref} className={className} {...props} />;
  }
  return (
    <div
      ref={ref}
      className={clsx("text-low hover:text-default transition", className)}
      onClick={(event) => {
        event.preventDefault();
        window.open(href, "_blank")?.focus();
      }}
      {...props}
    />
  );
}

const BuildRow = memo(function BuildRow({
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
        <Truncable className="text-low mt-1 text-xs">
          {build.name !== "default" ? build.name : ""}
        </Truncable>
      </div>
      <div className="flex w-[11rem] shrink-0 flex-col items-start gap-1">
        <BuildStatusChip build={build} />
      </div>
      <div className="hidden w-[9rem] shrink-0 items-start lg:flex">
        <BuildTestStatusChip build={build} />
      </div>
      <div className="flex grow">
        <div className="hidden lg:flex">
          {build.stats ? (
            <BuildStatsIndicator stats={build.stats} className="flex-wrap" />
          ) : null}
        </div>
      </div>
      <div className="hidden xl:block xl:w-56 2xl:w-96">
        {build.pullRequest && (
          <PullRequestButton
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
            <FakeLink
              className="inline-flex max-w-full items-center gap-2"
              href={
                project.repository
                  ? `${project.repository.url}/tree/${build.branch}`
                  : undefined
              }
            >
              <GitBranchIcon className="size-3 shrink-0" />
              <Truncable>{build.branch}</Truncable>
            </FakeLink>
          </div>
        )}
        <div>
          <FakeLink
            className="inline-flex max-w-full items-center gap-2"
            href={
              project.repository
                ? `${project.repository.url}/commit/${build.commit}`
                : undefined
            }
          >
            <GitCommitIcon className="size-3 shrink-0" />
            <span className="truncate">{build.commit.slice(0, 7)}</span>
          </FakeLink>
        </div>
      </div>
      <div
        className="text-low w-24 shrink-0 overflow-hidden truncate whitespace-nowrap text-right text-xs"
        data-visual-test="transparent"
      >
        <Time date={build.createdAt} />
      </div>
    </ListRowLink>
  );
});

const BuildsList = ({
  builds,
  project,
  fetching,
  fetchNextPage,
}: {
  builds: Builds;
  project: Project;
  fetching: boolean;
  fetchNextPage: () => void;
}) => {
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
      !fetching &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, displayCount, fetching, hasNextPage, fetchNextPage]);

  return (
    <List
      ref={parentRef}
      className="absolute max-h-full w-full"
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
};

function PageContent(props: { accountSlug: string; projectName: string }) {
  const { permissions } = useProjectOutletContext();
  const hasReviewerPermission = permissions.includes(ProjectPermission.Review);
  const [, setSearchParams] = useSearchParams();
  const clearFilters = () => {
    setSearchParams({});
  };
  const [buildName, setBuildName, isBuildNameDirty] = useBuildNameFilterState();
  const [buildStatus, setBuildStatus, isBuildStatusDirty] =
    useBuildStatusFilterState();
  const [buildType, setBuildType, isBuildTypeDirty] = useBuildTypeFilterState();
  const hasFilters = isBuildNameDirty || isBuildStatusDirty || isBuildTypeDirty;
  const projectResult = useQuery(ProjectQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
    },
  });
  if (projectResult.error) {
    throw projectResult.error;
  }

  const filters = useMemo(() => {
    return {
      name: buildName,
      type: Array.from(buildType),
      status: Array.from(buildStatus),
    };
  }, [buildName, buildType, buildStatus]);

  const buildsResult = useQuery(ProjectBuildsQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
      filters,
      after: 0,
      first: 20,
    },
  });
  if (buildsResult.error) {
    throw buildsResult.error;
  }

  const { fetchMore } = buildsResult;
  const buildResultRef = useRef(buildsResult);
  // @TODO try to fix this
  // eslint-disable-next-line react-hooks/refs
  buildResultRef.current = buildsResult;

  const fetchNextPage = useCallback(() => {
    const displayCount =
      buildResultRef.current.data?.project?.builds.edges.length;
    fetchMore({
      variables: {
        after: displayCount,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!prev.project?.builds?.edges || !fetchMoreResult?.project?.builds) {
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
  }, [fetchMore]);

  if (
    !(projectResult.data || projectResult.previousData) ||
    !(buildsResult.data || buildsResult.previousData)
  ) {
    return <PageLoader />;
  }

  const project =
    projectResult.data?.project || projectResult.previousData?.project;
  const builds =
    buildsResult.data?.project?.builds ||
    buildsResult.previousData?.project?.builds;

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
            <Heading>No build</Heading>
            <Text slot="description">
              There is no build yet on this project.
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
          <BuildTypeFilter value={buildType} onChange={setBuildType} />
          <BuildStatusFilter value={buildStatus} onChange={setBuildStatus} />
          {project.buildNames.length > 1 && (
            <BuildNameFilter
              buildNames={project.buildNames}
              value={buildName}
              onChange={setBuildName}
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
              There is no build matching the filters.
            </Text>
            <EmptyStateActions>
              <Button onPress={() => clearFilters()}>Reset filters</Button>
            </EmptyStateActions>
          </EmptyState>
        ) : (
          <BuildsList
            project={project}
            builds={builds}
            fetchNextPage={fetchNextPage}
            fetching={buildsResult.loading}
          />
        )}
      </div>
    </PageContainer>
  );
}

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>
          Builds • {accountSlug}/{projectName}
        </title>
      </Helmet>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </Page>
  );
}
