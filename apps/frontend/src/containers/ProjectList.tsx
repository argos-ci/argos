import { PlusCircleIcon } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";
import { Time } from "@/ui/Time";

import { getRepositoryIcon } from "./Repository";

const ProjectFragment = graphql(`
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

type Project = DocumentType<typeof ProjectFragment>;
type ProjectFragmentType = FragmentType<typeof ProjectFragment>;

const ProjectCard = ({ project }: { project: Project }) => {
  const repositoryType = project.repository?.__typename;
  const RepositoryIcon = repositoryType
    ? getRepositoryIcon(repositoryType)
    : null;
  return (
    <RouterLink
      key={project.id}
      to={`/${project.slug}`}
      className="bg-app hover:border-hover flex flex-col gap-4 rounded-md border p-4"
    >
      <div className="flex min-w-0 justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <AccountAvatar
            avatar={project.account.avatar}
            size={32}
            className="shrink-0"
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
    </RouterLink>
  );
};

const CreateProjectButton = (
  props: Omit<ButtonProps, "children" | "asChild">,
) => {
  return (
    <Button asChild {...props}>
      <RouterLink to="new">
        <ButtonIcon>
          <PlusCircleIcon />
        </ButtonIcon>
        Create a new Project
      </RouterLink>
    </Button>
  );
};

export const ProjectList = (props: {
  projects: ProjectFragmentType[];
  canCreateProject: boolean;
}) => {
  const projects = useFragment(ProjectFragment, props.projects);

  if (projects.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center">
        <div className="mb-2 text-2xl font-medium">
          There's no projects yet.
        </div>
        {props.canCreateProject && (
          <>
            <div className="text-low mb-4">
              Start by creating a new project.
            </div>
            <CreateProjectButton />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {props.canCreateProject && (
        <div className="flex justify-end">
          <CreateProjectButton variant="outline" color="neutral" />
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};
