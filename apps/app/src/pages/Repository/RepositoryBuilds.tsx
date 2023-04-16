import { useQuery } from "@apollo/client";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { Link as RouterLink, useParams } from "react-router-dom";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { Loader, useDelayedVisible } from "@/ui/Loader";
import { PageLoader } from "@/ui/PageLoader";
import { Time } from "@/ui/Time";

import { useRepositoryContext } from ".";
import { NotFound } from "../NotFound";
import { GettingStarted } from "./GettingStarted";

const RepositoryQuery = graphql(`
  query RepositoryBuilds_repository(
    $ownerLogin: String!
    $repositoryName: String!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      permissions
      ...GettingStarted_repository
      ...BuildStatusChip_Repository
    }
  }
`);

type RepositoryDocument = DocumentType<typeof RepositoryQuery>;
type Repository = NonNullable<RepositoryDocument["repository"]>;

const RepositoryBuildsQuery = graphql(`
  query RepositoryBuilds_repository_builds(
    $ownerLogin: String!
    $repositoryName: String!
    $after: Int!
    $first: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
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

type RepositoryBuildsDocument = DocumentType<typeof RepositoryBuildsQuery>;
type Builds = NonNullable<RepositoryBuildsDocument["repository"]>["builds"];
type Build = Builds["edges"][0];

const BuildRow = memo(
  ({ build, repository }: { build: Build; repository: Repository }) => {
    const { ownerLogin, repositoryName } = useParams();
    return (
      <RouterLink
        to={`/${ownerLogin}/${repositoryName}/builds/${build.number}`}
        className="flex items-center gap-4 border-b border-b-border px-4 py-2 text-sm transition hover:bg-slate-900/70 group-last:border-b-transparent"
      >
        <div className="w-[7ch] flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs tabular-nums text-on-light">
          <span>#{build.number}</span>
        </div>
        <div className="w-20 overflow-hidden text-ellipsis whitespace-nowrap tabular-nums text-on-light lg:w-40">
          {build.name !== "default" ? build.name : ""}
        </div>
        <div className="w-48 flex-shrink-0">
          <BuildStatusChip
            scale="sm"
            build={build}
            repository={repository}
            tooltip={false}
          />
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
                    `https://github.com/${ownerLogin}/${repositoryName}/commit/${build.compareScreenshotBucket.commit}`,
                    "_blank"
                  )
                  ?.focus();
              }}
            >
              <GitCommitIcon className="flex-shrink-0" />
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
                    `https://github.com/${ownerLogin}/${repositoryName}/tree/${build.compareScreenshotBucket.branch}`,
                    "_blank"
                  )
                  ?.focus();
              }}
              title={build.compareScreenshotBucket.branch}
            >
              <GitBranchIcon className="flex-shrink-0" />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {build.compareScreenshotBucket.branch}
              </span>
            </div>
          )}
        </div>
        <div className="hidden w-32 flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-right text-on-light sm:block">
          <Time date={build.createdAt} />
        </div>
      </RouterLink>
    );
  }
);

const ListLoader = memo(() => {
  const visible = useDelayedVisible(500);
  if (!visible) return null;
  return (
    <>
      <Loader size={24} delay={0} />
      <span>Fetching builds...</span>
    </>
  );
});

const BuildsList = ({
  builds,
  repository,
  fetching,
  fetchNextPage,
}: {
  builds: Builds;
  repository: Repository;
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
    <div
      ref={parentRef}
      className="my-4 max-h-max min-h-0 w-full overflow-auto rounded border border-border"
    >
      <div
        style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualItems.map((virtualRow) => {
          const build = builds.edges[virtualRow.index];
          if (!build) {
            return (
              <div
                key={`loader-${virtualRow.index}`}
                className="flex items-center justify-center gap-2 text-sm text-on-light"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ListLoader />
              </div>
            );
          }
          return (
            <div
              key={`build-${build.id}`}
              className="group"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <BuildRow build={build} repository={repository} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PageContent = (props: { ownerLogin: string; repositoryName: string }) => {
  const { hasWritePermission } = useRepositoryContext();
  const repositoryResult = useQuery(RepositoryQuery, {
    variables: {
      ownerLogin: props.ownerLogin,
      repositoryName: props.repositoryName,
    },
  });

  if (repositoryResult.error) {
    throw repositoryResult.error;
  }

  const buildsResult = useQuery(RepositoryBuildsQuery, {
    variables: {
      ownerLogin: props.ownerLogin,
      repositoryName: props.repositoryName,
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
      buildResultRef.current.data?.repository?.builds.edges.length;
    fetchMore({
      variables: {
        after: displayCount,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        return {
          ...prev,
          repository: {
            ...prev.repository!,
            builds: {
              ...prev.repository!.builds,
              ...fetchMoreResult.repository!.builds,
              edges: [
                ...prev.repository!.builds.edges,
                ...fetchMoreResult.repository!.builds.edges,
              ],
            },
          },
        };
      },
    });
  }, [fetchMore]);

  if (!repositoryResult.data || !buildsResult.data) {
    return (
      <Container>
        <PageLoader />
      </Container>
    );
  }

  const repository = repositoryResult.data.repository;
  const builds = buildsResult.data.repository?.builds;

  if (!repository || !builds) {
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
          <GettingStarted repository={repository} />
        </Container>
      );
    } else {
      return (
        <Container>
          <Alert>
            <AlertTitle>No build</AlertTitle>
            <AlertText>There is no build yet on this repository.</AlertText>
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
    <div className="container mx-auto flex min-h-0 flex-1 flex-col px-4">
      <BuildsList
        repository={repository}
        builds={builds}
        fetchNextPage={fetchNextPage}
        fetching={buildsResult.loading}
      />
    </div>
  );
};

export const RepositoryBuilds = () => {
  const { ownerLogin, repositoryName } = useParams();

  if (!ownerLogin || !repositoryName) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>
          {ownerLogin}/{repositoryName} • Builds
        </title>
      </Helmet>
      <PageContent ownerLogin={ownerLogin} repositoryName={repositoryName} />
    </>
  );
};
