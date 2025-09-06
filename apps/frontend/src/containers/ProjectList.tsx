import { FolderIcon, PlusCircleIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { HeadlessLink } from "@/ui/Link";
import { Time } from "@/ui/Time";

import { getRepositoryIcon } from "./Repository";

const _ProjectFragment = graphql(`
  fragment ProjectList_Project on Project {
    id
    name
    slug
    account {
      id
      slug
      name
      avatar {
        ...AccountAvatarFragment
      }
    }
    repository {
      __typename
      id
      fullName
    }
    latestBuild {
      id
      createdAt
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;

function ProjectCard({ project }: { project: Project }) {
  const repositoryType = project.repository?.__typename;
  const RepositoryIcon = repositoryType
    ? getRepositoryIcon(repositoryType)
    : null;
  return (
    <HeadlessLink
      key={project.id}
      href={`/${project.slug}`}
      className="bg-app hover:border-hover flex flex-col gap-4 rounded-md border p-4"
    >
      <div className="flex min-w-0 justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <AccountAvatar
            avatar={project.account.avatar}
            className="size-8 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{project.name}</div>
            <div className="text-low truncate text-sm">
              {project.repository?.fullName ?? "-"}
            </div>
          </div>
        </div>
        {RepositoryIcon && <RepositoryIcon className="size-6 shrink-0" />}
      </div>
      <div className="text-low text-sm">
        {project.latestBuild ? (
          <>
            Last build <Time date={project.latestBuild.createdAt} />
          </>
        ) : (
          "-"
        )}
      </div>
    </HeadlessLink>
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
      <div className="grid grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </PageContainer>
  );
}
