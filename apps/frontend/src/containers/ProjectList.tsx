import { GitBranchIcon } from "@primer/octicons-react";
import { FolderIcon, PlusCircleIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission, DeploymentStatus } from "@/gql/graphql";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderHeadline,
} from "@/ui/Layout";
import { HeadlessLink, Link } from "@/ui/Link";
import { Time } from "@/ui/Time";

import { RepositoryIcons } from "./Repository";
import { TeamOwnersPopover } from "./Team/TeamOwnersPopover";

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
      url
      external
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;

/**
 * Where production is served: the project's own domain for a deployment Argos
 * hosts, or the deployment's URL for one hosted elsewhere.
 */
function getProductionUrl(project: Project): string | null {
  const deployment = project.latestProductionDeployment;
  if (deployment?.status !== DeploymentStatus.Ready) {
    return null;
  }
  if (deployment.external) {
    return deployment.url;
  }
  return project.domain ? `https://${project.domain}` : null;
}

function RepositoryChip(props: { repository: Project["repository"] }) {
  const repositoryType = props.repository?.__typename;
  const RepositoryIcon = repositoryType
    ? RepositoryIcons[repositoryType]
    : null;

  if (!props.repository || !RepositoryIcon) {
    return null;
  }

  return (
    <Chip
      scale="sm"
      color="neutral"
      icon={<RepositoryIcon />}
      className="max-w-full"
    >
      {props.repository.fullName}
    </Chip>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const productionUrl = getProductionUrl(project);
  return (
    <div
      key={project.id}
      className="bg-app hover:border-hover border-thin relative flex min-w-0 flex-col items-start gap-2 rounded-xl p-5 pt-4 shadow-xs hover:shadow"
    >
      <HeadlessLink
        aria-label={`Visit ${project.name}`}
        className="absolute inset-0"
        href={`/${project.slug}`}
      />
      <div className="w-full min-w-0">
        <div className="truncate font-medium">{project.name}</div>
        <div className="text-low mt-1 truncate text-sm">
          {productionUrl ? (
            <Link
              className="relative"
              variant="neutral"
              href={productionUrl}
              target="_blank"
              external={false}
            >
              {new URL(productionUrl).host}
            </Link>
          ) : (
            "Not deployed"
          )}
        </div>
      </div>
      <RepositoryChip repository={project.repository} />
      {project.latestProductionDeployment ? (
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
  account: {
    __typename: "Team" | "User";
    slug: string;
    permissions: AccountPermission[];
  };
  /** A contributor sees only the projects they were added to. */
  isContributor: boolean;
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
          <EmptyStateDescription>
            Start by creating your first Argos project.
          </EmptyStateDescription>
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
        <EmptyStateDescription>
          {props.account.__typename !== "Team" ? (
            "This account has no projects yet."
          ) : props.isContributor ? (
            <>
              You have not been added to any project yet. Ask{" "}
              <TeamOwnersPopover account={props.account}>
                a team owner
              </TeamOwnersPopover>{" "}
              to add you to one.
            </>
          ) : (
            <>
              Only{" "}
              <TeamOwnersPopover account={props.account}>
                team owners
              </TeamOwnersPopover>{" "}
              can create projects.
            </>
          )}
        </EmptyStateDescription>
      </EmptyState>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Projects</Heading>
          <PageHeaderHeadline>
            View all the projects associated with this account.
          </PageHeaderHeadline>
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
