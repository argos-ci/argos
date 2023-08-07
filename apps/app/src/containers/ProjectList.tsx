import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { MarkGithubIcon } from "@primer/octicons-react";
import { Link as RouterLink } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";
import { Time } from "@/ui/Time";

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
    ghRepository {
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
  return (
    <RouterLink
      key={project.id}
      to={`/${project.slug}`}
      className="flex flex-col gap-4 rounded-md border bg-app p-4 hover:border-hover"
    >
      <div className="flex justify-between">
        <div className="flex items-center gap-4">
          <AccountAvatar
            avatar={project.account.avatar}
            size={32}
            className="shrink-0"
          />
          <div>
            <div className="font-medium">{project.name}</div>
            <div className="text-sm text-low">
              {project.ghRepository?.fullName ?? "-"}
            </div>
          </div>
        </div>
        <MarkGithubIcon className="h-6 w-6 shrink-0" />
      </div>
      <div className="text-sm text-low">
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

const CreateProjectButton = (props: ButtonProps) => {
  return (
    <Button {...props}>
      {(buttonProps) => (
        <RouterLink to="new" {...buttonProps}>
          <ButtonIcon>
            <PlusCircleIcon />
          </ButtonIcon>
          Create a new Project
        </RouterLink>
      )}
    </Button>
  );
};

export const ProjectList = (props: { projects: ProjectFragmentType[] }) => {
  const projects = useFragment(ProjectFragment, props.projects);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="mb-2 text-2xl font-medium">No projects yet!</div>
        <div className="mb-4 text-low">Start by creating a new project.</div>
        <CreateProjectButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateProjectButton variant="outline" color="neutral" />
      </div>
      <div className="grid grid-cols-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};
