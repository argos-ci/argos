import { FolderIcon, PlusCircleIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
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
    }
    latestBuild {
      id
      number
      createdAt
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;

function RepositoryBadge(props: { repository: Project["repository"] }) {
  const repositoryType = props.repository?.__typename;
  const RepositoryIcon = repositoryType
    ? RepositoryIcons[repositoryType]
    : null;

  if (!props.repository || !RepositoryIcon) {
    return null;
  }

  return (
    <Chip scale="sm" icon={<RepositoryIcon />}>
      {props.repository.fullName}
    </Chip>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      key={project.id}
      className="bg-app hover:border-hover relative flex min-h-44 min-w-0 flex-col items-start gap-3 rounded-md border p-5"
    >
      <HeadlessLink className="absolute inset-0" href={`/${project.slug}`} />
      <div className="min-w-0">
        <div className="truncate font-medium">{project.name}</div>
        <div className="text-low mt-1 truncate text-sm">
          {project.domain ?? "—"}
        </div>
      </div>
      <RepositoryBadge repository={project.repository} />
      <div className="text-low text-xs">
        {project.latestBuild ? (
          <>
            Last build{" "}
            <Link
              variant="neutral"
              className="relative"
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
