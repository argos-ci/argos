import { useEffect, useRef, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useFlag } from "@reflag/react-sdk";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BoxesIcon, GlobeIcon, RocketIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { LinkButton } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { List, ListRow, ListRowLoader } from "@/ui/List";
import { Time } from "@/ui/Time";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";

import { NotFound } from "../NotFound";
import { ProjectBranchLink, ProjectCommitLink } from "./ProjectGitLink";
import { useProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectDeploymentsQuery = graphql(`
  query ProjectDeployments_project_Deployments(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      repository {
        __typename
        id
        url
      }
      deployments(first: $first, after: $after) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          createdAt
          status
          environment
          branch
          commitSha
          url
        }
      }
    }
  }
`);

type ProjectDeploymentsDocument = DocumentType<typeof ProjectDeploymentsQuery>;
type Project = NonNullable<ProjectDeploymentsDocument["project"]>;
type Deployments = Project["deployments"];
type Deployment = Deployments["edges"][0];

function getDeploymentStatusColor(status: Deployment["status"]) {
  switch (status) {
    case "pending":
      return "pending";
    case "ready":
      return "success";
    case "error":
      return "danger";
    default:
      return "neutral";
  }
}

function getDeploymentEnvironmentColor(environment: Deployment["environment"]) {
  switch (environment) {
    case "preview":
      return "info";
    case "production":
      return "primary";
    default:
      return "neutral";
  }
}

function DeploymentRow(props: {
  deployment: Deployment;
  project: Project;
  style: React.CSSProperties;
}) {
  const { deployment, project, style } = props;
  return (
    <ListRow className="flex items-center gap-6 p-4 text-sm" style={style}>
      <div className="flex w-40 shrink-0 flex-col items-start gap-2">
        <Chip
          icon={RocketIcon}
          color={getDeploymentStatusColor(deployment.status)}
          scale="sm"
        >
          {deployment.status}
        </Chip>
        <Chip
          icon={GlobeIcon}
          color={getDeploymentEnvironmentColor(deployment.environment)}
          scale="sm"
        >
          {deployment.environment}
        </Chip>
      </div>
      <div className="min-w-0 grow">
        <div className="flex flex-col gap-1 text-xs">
          <div>
            <ProjectBranchLink
              className="inline-flex max-w-full items-center"
              repository={project.repository}
              branch={deployment.branch}
            />
          </div>
          <div>
            <ProjectCommitLink
              className="inline-flex max-w-full items-center"
              repository={project.repository}
              commit={deployment.commitSha}
            />
          </div>
          <div className="text-low flex items-center gap-[0.4em]">
            <GlobeIcon className="size-3 shrink-0" />
            <Link
              className="inline-flex max-w-full min-w-0 items-center"
              variant="neutral"
              target="_blank"
              href={deployment.url}
            >
              <Truncable>{deployment.url}</Truncable>
            </Link>
          </div>
        </div>
      </div>
      <div
        className="text-low w-24 shrink-0 truncate overflow-hidden text-right text-xs whitespace-nowrap"
        data-visual-test="transparent"
      >
        <Time date={deployment.createdAt} />
      </div>
    </ListRow>
  );
}

function DeploymentsList(props: {
  deployments: Deployments;
  project: Project;
  isFetchingMore: boolean;
  fetchNextPage: () => void;
}) {
  const { deployments, project, isFetchingMore, fetchNextPage } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = deployments.pageInfo;
  const displayCount = deployments.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 88,
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
          const deployment = deployments.edges[virtualRow.index];

          if (!deployment) {
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
                Fetching deployments...
              </ListRowLoader>
            );
          }

          return (
            <DeploymentRow
              key={`deployment-${deployment.id}`}
              deployment={deployment}
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

function PageContent() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  const { fetchMore, data } = useSuspenseQuery(ProjectDeploymentsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: 20,
    },
  });

  const project = data.project;
  const deployments = project?.deployments;

  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(deployments);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: {
          after: deployments.edges.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (
            !prev.project?.deployments?.edges ||
            !fetchMoreResult?.project?.deployments
          ) {
            return fetchMoreResult;
          }

          return {
            ...prev,
            project: {
              ...prev.project,
              deployments: {
                ...prev.project.deployments,
                ...fetchMoreResult.project.deployments,
                edges: [
                  ...prev.project.deployments.edges,
                  ...fetchMoreResult.project.deployments.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  if (!project || !deployments) {
    return <NotFound />;
  }

  if (deployments.pageInfo.totalCount === 0) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <BoxesIcon strokeWidth={1} />
          </EmptyStateIcon>
          <Heading>No deployments</Heading>
          <Text slot="description">
            There are no deployments yet on this project.
          </Text>
          <EmptyStateActions>
            <LinkButton href="/">Back to home</LinkButton>
          </EmptyStateActions>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Deployments</Heading>
          <Text slot="headline">
            View all the deployments associated with this project.
          </Text>
        </PageHeaderContent>
      </PageHeader>
      <div className="relative flex-1">
        <DeploymentsList
          project={project}
          deployments={deployments}
          fetchNextPage={fetchNextPage}
          isFetchingMore={isFetchingMore}
        />
      </div>
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const deploymentsFlag = useFlag("deployments");

  if (deploymentsFlag.isLoading) {
    return null;
  }

  if (!deploymentsFlag.isEnabled) {
    return <NotFound />;
  }

  return (
    <Page>
      <ProjectTitle params={params}>Deployments</ProjectTitle>
      <PageContent />
    </Page>
  );
}
