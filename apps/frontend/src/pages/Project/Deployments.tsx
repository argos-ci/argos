import { useEffect, useRef, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { useFlag } from "@reflag/react-sdk";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { BoxesIcon, CircleArrowUpIcon, GlobeIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import type { DeploymentEnvironment, DeploymentStatus } from "@/gql/graphql";
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
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { bgSolidColorClassNames, type UIColor } from "@/util/colors";

import { getBuildURL } from "../Build/BuildParams";
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
          aliases {
            id
            updatedAt
            type
            url
          }
          pullRequest {
            id
            ...PullRequestButton_PullRequest
          }
          build {
            id
            number
          }
        }
      }
    }
  }
`);

type ProjectDeploymentsDocument = DocumentType<typeof ProjectDeploymentsQuery>;
type Project = NonNullable<ProjectDeploymentsDocument["project"]>;
type Deployments = Project["deployments"];
type Deployment = Deployments["edges"][0];

const EnvironmentLabel: Record<DeploymentEnvironment, string> = {
  preview: "Preview",
  production: "Production",
};

const StatusDef: Record<DeploymentStatus, { label: string; color: UIColor }> = {
  error: { label: "Error", color: "danger" },
  pending: { label: "Pending", color: "pending" },
  ready: { label: "Ready", color: "success" },
};

function DeploymentTargetLink(props: {
  href: string;
  children: React.ReactNode;
  type: "deployment" | Deployment["aliases"][number]["type"];
}) {
  const { href, children, type } = props;

  return (
    <div className="text-low flex items-center gap-[0.4em]">
      {type === "deployment" ? (
        <GitCommitIcon className="size-3 shrink-0" />
      ) : type === "branch" ? (
        <GitBranchIcon className="size-3 shrink-0" />
      ) : (
        <GlobeIcon className="size-3 shrink-0" />
      )}
      <Link
        className="inline-flex max-w-full min-w-0 items-center"
        variant="neutral"
        target="_blank"
        href={href}
      >
        <Truncable>{children}</Truncable>
      </Link>
    </div>
  );
}

function CurrentDeploymentBadge(props: { updatedAt: string }) {
  return (
    <Tooltip
      content={
        <div className="flex flex-col items-center gap-1 px-0.5 py-1 text-center">
          <div>
            Promoted <Time date={props.updatedAt} tooltip="none" /> to serve
            production traffic
          </div>
          <div className="text-low">
            <Time
              date={props.updatedAt}
              format="D MMM YYYY [at] HH:mm:ss"
              tooltip="none"
            />
          </div>
        </div>
      }
    >
      <Chip
        color="primary"
        scale="xs"
        icon={CircleArrowUpIcon}
        className="shrink-0"
      >
        Current
      </Chip>
    </Tooltip>
  );
}

function DeploymentRow(props: {
  deployment: Deployment;
  project: Project;
  index: number;
  measureElement?: (element: HTMLDivElement | null) => void;
}) {
  const { deployment, project, index, measureElement } = props;
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const statusDef = StatusDef[deployment.status];
  const domainAlias = deployment.aliases.find((alias) => {
    return alias.type === "domain";
  });

  return (
    <ListRow
      ref={measureElement}
      data-index={index}
      className="flex items-start gap-6 p-4 text-sm"
    >
      <div className="flex w-40 shrink-0 flex-col items-start gap-1">
        <div className="font-medium">{deployment.id}</div>
        <div className="text-low flex max-w-full flex-wrap items-center gap-1">
          <span>{EnvironmentLabel[deployment.environment]}</span>
          {domainAlias ? (
            <CurrentDeploymentBadge updatedAt={domainAlias.updatedAt} />
          ) : null}
        </div>
      </div>
      <div className="text-low flex w-28 shrink-0 items-center gap-2">
        <div
          className={clsx(
            "size-2.5 rounded-full",
            bgSolidColorClassNames[statusDef.color],
          )}
        />
        {statusDef.label}
      </div>
      <div className="w-28 shrink-0">
        {deployment.build ? (
          <Link
            variant="neutral"
            href={getBuildURL({
              ...params,
              buildNumber: deployment.build.number,
            })}
          >
            Build #{deployment.build.number}
          </Link>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 truncate">
        {deployment.aliases.map((alias) => (
          <DeploymentTargetLink
            key={alias.id}
            href={alias.url}
            type={alias.type}
          >
            {alias.url}
          </DeploymentTargetLink>
        ))}
        <DeploymentTargetLink href={deployment.url} type="deployment">
          {deployment.url}
        </DeploymentTargetLink>
      </div>
      <div className="flex w-70 shrink-0">
        {deployment.pullRequest && (
          <PullRequestButton
            size="small"
            pullRequest={deployment.pullRequest}
            className="max-w-full"
            target="_blank"
          />
        )}
      </div>
      <div className="flex w-40 shrink-0 flex-col gap-1 text-xs">
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
    estimateSize: () => 120,
    getScrollElement: () => parentRef.current,
    overscan: 20,
    getItemKey: (index) => {
      const deployment = deployments.edges[index];
      return deployment?.id ?? "loader";
    },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];
  const firstItem = virtualItems[0];

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
        <div
          style={{
            transform: `translateY(${firstItem?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((virtualRow) => {
            const deployment = deployments.edges[virtualRow.index];

            if (!deployment) {
              return (
                <ListRowLoader key={`loader-${virtualRow.index}`}>
                  Fetching deployments...
                </ListRowLoader>
              );
            }

            return (
              <DeploymentRow
                key={virtualRow.key}
                deployment={deployment}
                project={project}
                index={virtualRow.index}
                measureElement={rowVirtualizer.measureElement}
              />
            );
          })}
        </div>
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
