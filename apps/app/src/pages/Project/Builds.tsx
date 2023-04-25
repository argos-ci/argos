import { useQuery } from "@apollo/client";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CSSProperties, memo, useCallback, useEffect, useRef } from "react";
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

import { useProjectContext } from ".";
import { NotFound } from "../NotFound";
import { GettingStarted } from "./GettingStarted";

const ProjectQuery = graphql(`
  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
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
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      builds(first: $first, after: $after) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          number
          createdAt
          name
          compareScreenshotBucket {
            id
            branch
            commit
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

const BuildRow = memo(
  ({
    build,
    project,
    style,
  }: {
    build: Build;
    project: Project;
    style: CSSProperties;
  }) => {
    const { accountSlug, projectName } = useParams();
    return (
      <ListRow asChild clickable className="px-4 py-2 text-sm" style={style}>
        <RouterLink
          to={`/${accountSlug}/${projectName}/builds/${build.number}`}
        >
          <div className="w-[7ch] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs tabular-nums text-on-light">
            <span>#{build.number}</span>
          </div>
          <div className="w-20 overflow-hidden text-ellipsis whitespace-nowrap tabular-nums text-on-light lg:w-40">
            {build.name !== "default" ? build.name : ""}
          </div>
          <div className="w-48 shrink-0">
            <BuildStatusChip scale="sm" build={build} project={project} />
          </div>
          <div className="flex-1" />
          <div className="relative hidden w-24 md:block">
            {build.compareScreenshotBucket && (
              <div
                className="inline-flex max-w-full items-center gap-1 text-on-light transition hover:text-on"
                title={build.compareScreenshotBucket.commit}
                onClick={(event) => {
                  event.preventDefault();
                  window
                    .open(
                      `https://github.com/${accountSlug}/${projectName}/commit/${build.compareScreenshotBucket.commit}`,
                      "_blank"
                    )
                    ?.focus();
                }}
              >
                <GitCommitIcon className="shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {build.compareScreenshotBucket.commit.slice(0, 7)}
                </span>
              </div>
            )}
          </div>
          <div className="relative hidden w-28 sm:block lg:w-80">
            {build.compareScreenshotBucket && (
              <div
                className="inline-flex max-w-full items-center gap-1 text-on-light transition hover:text-on"
                onClick={(event) => {
                  event.preventDefault();
                  window
                    .open(
                      `https://github.com/${accountSlug}/${projectName}/tree/${build.compareScreenshotBucket.branch}`,
                      "_blank"
                    )
                    ?.focus();
                }}
                title={build.compareScreenshotBucket.branch}
              >
                <GitBranchIcon className="shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {build.compareScreenshotBucket.branch}
                </span>
              </div>
            )}
          </div>
          <div className="hidden w-32 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-right text-on-light sm:block">
            <Time date={build.createdAt} />
          </div>
        </RouterLink>
      </ListRow>
    );
  }
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
  const parentRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage } = builds.pageInfo;
  const displayCount = builds.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 43,
    getScrollElement: () => parentRef.current,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index >= displayCount - 1 &&
      hasNextPage &&
      !fetching
    ) {
      fetchNextPage();
    }
  }, [lastItem, hasNextPage, fetching, fetchNextPage, displayCount]);

  return (
    <List ref={parentRef} className="max-h-max min-h-0 w-full overflow-scroll">
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
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
  const { hasWritePermission } = useProjectContext();
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
      after: 0,
      first: 20,
    },
  });

  const { fetchMore } = buildsResult;
  const buildResultRef = useRef(buildsResult);
  buildResultRef.current = buildsResult;

  if (buildsResult.error) {
    throw buildsResult.error;
  }

  const fetchNextPage = useCallback(() => {
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

  if (!projectResult.data || !buildsResult.data) {
    return (
      <Container>
        <PageLoader />
      </Container>
    );
  }

  const project = projectResult.data.project;
  const builds = buildsResult.data.project?.builds;

  if (!project || !builds) {
    return (
      <Container>
        <NotFound />
      </Container>
    );
  }

  if (builds.pageInfo.totalCount === 0) {
    if (hasWritePermission) {
      return (
        <Container>
          <GettingStarted project={project} />
        </Container>
      );
    } else {
      return (
        <Container>
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
    <Container className="flex min-h-0 flex-1 flex-col">
      <BuildsList
        project={project}
        builds={builds}
        fetchNextPage={fetchNextPage}
        fetching={buildsResult.loading}
      />
    </Container>
  );
};

export const ProjectBuilds = () => {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Builds
        </title>
      </Helmet>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </>
  );
};
