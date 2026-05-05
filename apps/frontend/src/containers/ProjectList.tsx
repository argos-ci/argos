import { GitBranchIcon } from "@primer/octicons-react";
import { useFlag } from "@reflag/react-sdk";
import { FolderIcon, PlusCircleIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { DeploymentStatus } from "@/gql/graphql";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { HeadlessLink, Link } from "@/ui/Link";
import { Time } from "@/ui/Time";

import { RepositoryIcons } from "./Repository";

const _ProjectFragment = graphql(`
  fragment ProjectList_Project on Project {
    id
    name
    slug
    domain
    repository {
      __typename
      id
      fullName
      url
    }
    latestBuild {
      id
      number
      createdAt
    }
    latestProductionDeployment {
      id
      createdAt
      status
      branch
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;

function RepositoryChip(props: { repository: Project["repository"] }) {
  const repositoryType = props.repository?.__typename;
  const RepositoryIcon = repositoryType
    ? RepositoryIcons[repositoryType]
    : null;

  if (!props.repository || !RepositoryIcon) {
    return null;
  }

  return (
    <Chip scale="sm" color="neutral" icon={<RepositoryIcon />}>
      {props.repository.fullName}
    </Chip>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const deploymentsFlag = useFlag("deployments");
  return (
    <div
      key={project.id}
      className="bg-app hover:border-hover relative flex min-w-0 flex-col items-start gap-2 rounded-md border p-5 pt-4"
    >
      <HeadlessLink
        aria-label={`Visit ${project.name}`}
        className="absolute inset-0"
        href={`/${project.slug}`}
      />
      <div className="min-w-0">
        <div className="truncate font-medium">{project.name}</div>
        {deploymentsFlag.isEnabled && (
          <div className="text-low mt-1 truncate text-sm">
            {project.latestProductionDeployment?.status ===
              DeploymentStatus.Ready && project.domain ? (
              <Link
                className="relative"
                variant="neutral"
                href={`https://${project.domain}`}
                target="_blank"
                external={false}
              >
                {project.domain}
              </Link>
            ) : (
              "Not deployed"
            )}
          </div>
        )}
      </div>
      <RepositoryChip repository={project.repository} />
      {deploymentsFlag.isEnabled && project.latestProductionDeployment ? (
        <div className="text-low relative text-xs">
          Deployed <Time date={project.latestProductionDeployment.createdAt} />{" "}
          on <GitBranchIcon className="inline size-3 align-middle" />{" "}
          <span className="truncate">
            {project.latestProductionDeployment.branch}
          </span>
        </div>
      ) : null}
      <div className="text-low relative text-xs">
        {project.latestBuild ? (
          <>
            Last build{" "}
            <Link
              variant="neutral"
              href={`/${project.slug}/builds/${project.latestBuild.number}`}
            >
              #{project.latestBuild.number}
            </Link>{" "}
            <Time date={project.latestBuild.createdAt} />
          </>
        ) : (
          "No build yet"
        )}
      </div>
    </div>
  );
}

function CreateProjectButton(props: Omit<LinkButtonProps, "children">) {
  return (
    <LinkButton href="new" {...props}>
      <ButtonIcon>
        <PlusCircleIcon />
      </ButtonIcon>
      Create a new Project
    </LinkButton>
  );
}

export function ProjectList(props: {
  projects: Project[];
  canCreateProject: boolean;
}) {
  const { projects } = props;

  if (projects.length === 0) {
    if (props.canCreateProject) {
      return (
        <EmptyState>
          <EmptyStateIcon>
            <FolderIcon />
          </EmptyStateIcon>
          <Heading>Create your first project</Heading>
          <Text slot="description">
            Start by creating your first Argos project.
          </Text>
          <EmptyStateActions>
            <CreateProjectButton />
          </EmptyStateActions>
        </EmptyState>
      );
    }

    return (
      <EmptyState>
        <EmptyStateIcon>
          <FolderIcon />
        </EmptyStateIcon>
        <Heading>No projects</Heading>
        <Text slot="description">You haven't created any project yet.</Text>
        {props.canCreateProject && (
          <EmptyStateActions>
            <CreateProjectButton />
          </EmptyStateActions>
        )}
      </EmptyState>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Projects</Heading>
          <Text slot="headline">
            View all the projects associated with this account.
          </Text>
        </PageHeaderContent>
        {props.canCreateProject && (
          <PageHeaderActions>
            <CreateProjectButton variant="secondary" />
          </PageHeaderActions>
        )}
      </PageHeader>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </PageContainer>
  );
}
