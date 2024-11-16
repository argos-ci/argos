import * as React from "react";
import { useQuery } from "@apollo/client";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import { Helmet } from "react-helmet";
import { useParams, useResolvedPath } from "react-router-dom";

import { BuildModeIndicator } from "@/containers/BuildModeIndicator";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { List, ListRowLink, ListRowLoader } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";
import { Time } from "@/ui/Time";
import { Truncable } from "@/ui/Truncable";

import { useProjectContext } from ".";
import { BuildStatsIndicator } from "../Build/BuildStatsIndicator";
import { NotFound } from "../NotFound";
import { BuildNameFilter, useBuildNameFilter } from "./BuildNameFilter";
import { GettingStarted } from "./GettingStarted";

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
    $buildName: String
  ) {
    project(
      accountSlug: $accountSlug
      projectName: $projectName
      buildName: $buildName
    ) {
      id
      builds(first: $first, after: $after, buildName: $buildName) {
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
        }
      }
    }
  }
`);

type ProjectBuildsDocument = DocumentType<typeof ProjectBuildsQuery>;
type Builds = NonNullable<ProjectBuildsDocument["project"]>["builds"];
type Build = Builds["edges"][0];

const FakeLink = React.forwardRef(
  (
    {
      className,
      href,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { href: string | undefined },
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    if (!href) {
      return <div ref={ref} className={className} {...props} />;
    }
    return (
      <div
        ref={ref}
        className={clsx("text-low hover:text transition", className)}
        onClick={(event) => {
          event.preventDefault();
          window.open(href, "_blank")?.focus();
        }}
        {...props}
      />
    );
  },
);

const BuildRow = React.memo(
  ({
    build,
    project,
    style,
  }: {
    build: Build;
    project: Project;
    style: React.CSSProperties;
  }) => {
    const resolvedBuild = useResolvedPath(`builds/${build.number}`);
    return (
      <ListRowLink
        href={resolvedBuild.pathname}
        className="items-center p-4 text-sm"
        style={style}
      >
        <div className="w-20 shrink-0">
          <div className="flex items-center gap-1">
            <BuildModeIndicator mode={build.mode} />
            <div className="tabular-nums">{build.number}</div>
          </div>
          <div className="text-low truncate">
            {build.name !== "default" ? build.name : ""}
          </div>
        </div>
        <div className="flex w-[12.5rem] shrink-0 items-start">
          <BuildStatusChip build={build} />
        </div>
        <div className="flex grow">
          <div className="hidden lg:flex">
            <BuildStatsIndicator
              stats={build.stats}
              className="flex-wrap gap-3"
            />
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
        <div className="relative hidden w-32 md:block">
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
          className="text-low w-24 shrink-0 overflow-hidden truncate whitespace-nowrap text-right"
          data-visual-test="transparent"
        >
          <Time date={build.createdAt} />
        </div>
      </ListRowLink>
    );
  },
);

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
  const parentRef = React.useRef<HTMLDivElement | null>(null);
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
  React.useEffect(() => {
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

const PageContent = (props: { accountSlug: string; projectName: string }) => {
  const { permissions } = useProjectContext();
  const hasReviewerPermission = permissions.includes(ProjectPermission.Review);
  const [buildName, setBuildName] = useBuildNameFilter();
  const projectResult = useQuery(ProjectQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
    },
  });

  if (projectResult.error) {
    throw projectResult.error;
  }

  const buildsResult = useQuery(ProjectBuildsQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
      buildName,
      after: 0,
      first: 20,
    },
  });

  const { fetchMore } = buildsResult;
  const buildResultRef = React.useRef(buildsResult);
  buildResultRef.current = buildsResult;

  if (buildsResult.error) {
    throw buildsResult.error;
  }

  const fetchNextPage = React.useCallback(() => {
    const displayCount =
      buildResultRef.current.data?.project?.builds.edges.length;
    fetchMore({
      variables: {
        after: displayCount,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        return {
          ...prev,
          project: {
            ...prev.project!,
            builds: {
              ...prev.project!.builds,
              ...fetchMoreResult.project!.builds,
              edges: [
                ...prev.project!.builds.edges,
                ...fetchMoreResult.project!.builds.edges,
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
    return (
      <Container className="py-10">
        <PageLoader />
      </Container>
    );
  }

  const project =
    projectResult.data?.project || projectResult.previousData?.project;
  const builds =
    buildsResult.data?.project?.builds ||
    buildsResult.previousData?.project?.builds;

  if (!project || !builds) {
    return (
      <Container className="py-10">
        <NotFound />
      </Container>
    );
  }

  if (builds.pageInfo.totalCount === 0) {
    if (hasReviewerPermission) {
      return (
        <Container className="py-10">
          <GettingStarted project={project} />
        </Container>
      );
    } else {
      return (
        <Container className="py-10">
          <Alert>
            <AlertTitle>No build</AlertTitle>
            <AlertText>There is no build yet on this project.</AlertText>
            <AlertActions>
              <LinkButton href="/">Back to home</LinkButton>
            </AlertActions>
          </Alert>
        </Container>
      );
    }
  }

  return (
    <Container className="flex flex-1 flex-col pb-10 pt-4">
      {project.buildNames.length > 1 && (
        <BuildNameFilter
          buildNames={project.buildNames}
          value={buildName}
          onChange={setBuildName}
        />
      )}
      <div className="relative flex-1">
        <BuildsList
          project={project}
          builds={builds}
          fetchNextPage={fetchNextPage}
          fetching={buildsResult.loading}
        />
      </div>
    </Container>
  );
};

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <div className="bg-subtle flex min-h-0 flex-1 flex-col">
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Builds
        </title>
      </Helmet>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </div>
  );
}
