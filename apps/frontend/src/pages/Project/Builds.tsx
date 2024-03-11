import { useQuery } from "@apollo/client";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import * as React from "react";
import { Helmet } from "react-helmet";
import { Link as RouterLink, useParams } from "react-router-dom";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { List, ListRow, ListRowLoader } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";
import { Time } from "@/ui/Time";

import { PullRequestButton } from "@/containers/PullRequestButton";
import { Truncable } from "@/ui/Truncable";
import { useProjectContext } from ".";
import { NotFound } from "../NotFound";
import { BuildNameFilter, useBuildNameFilter } from "./BuildNameFilter";
import { GettingStarted } from "./GettingStarted";
import { ProjectPermission } from "@/gql/graphql";

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
      ...BuildStatusChip_Project
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
        className={clsx("text-low transition hover:text", className)}
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
    const { accountSlug, projectName } = useParams();
    return (
      <ListRow
        asChild
        clickable
        className="p-4 text-sm items-center"
        style={style}
      >
        <RouterLink
          to={`/${accountSlug}/${projectName}/builds/${build.number}`}
        >
          <div className="w-20 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <div className="tabular-nums">#{build.number}</div>
            <div className="text-low">
              {build.name !== "default" ? build.name : ""}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start">
            <BuildStatusChip build={build} project={project} />
          </div>
          <div className="flex-1" />
          <div className="hidden xl:block w-96">
            {build.pullRequest && (
              <PullRequestButton
                emulatedAnchor
                pullRequest={build.pullRequest}
                className="max-w-full"
              />
            )}
          </div>
          <div className="relative hidden w-60 md:block">
            <div>
              <FakeLink
                className="inline-flex items-center max-w-full gap-2"
                href={
                  project.repository
                    ? `${project.repository.url}/tree/${build.branch}`
                    : undefined
                }
              >
                <GitBranchIcon className="shrink-0 w-3 h-3" />
                <Truncable>{build.branch}</Truncable>
              </FakeLink>
            </div>
            <div>
              <FakeLink
                className="inline-flex items-center max-w-full gap-2"
                href={
                  project.repository
                    ? `${project.repository.url}/commit/${build.commit}`
                    : undefined
                }
              >
                <GitCommitIcon className="shrink-0 w-3 h-3" />
                <span className="truncate">{build.commit.slice(0, 7)}</span>
              </FakeLink>
            </div>
          </div>
          <div
            className="w-32 shrink-0 overflow-hidden truncate whitespace-nowrap text-right text-low"
            data-visual-test="transparent"
          >
            <Time date={build.createdAt} />
          </div>
        </RouterLink>
      </ListRow>
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
              <Button>
                {(buttonProps) => (
                  <RouterLink to="/" {...buttonProps}>
                    Back to home
                  </RouterLink>
                )}
              </Button>
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

export const ProjectBuilds = () => {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-subtle">
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Builds
        </title>
      </Helmet>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </div>
  );
};
