import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { Link as RouterLink } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Badge } from "@/ui/Badge";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";

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
    builds(first: 0, after: 0) {
      pageInfo {
        totalCount
      }
    }
  }
`);

type Project = DocumentType<typeof ProjectFragment>;
type ProjectFragmentType = FragmentType<typeof ProjectFragment>;

const ProjectRow = ({ project }: { project: Project }) => {
  return (
    <RouterLink
      key={project.id}
      to={`/${project.slug}`}
      className="flex items-center justify-between rounded border bg-app p-3 font-medium hover:border-hover"
    >
      <div className="flex shrink-0 gap-1">
        <span className="flex gap-2">
          <AccountAvatar
            avatar={project.account.avatar}
            size={24}
            className="shrink-0"
          />
          {project.account.name}
        </span>
        <span className="text-low">/</span>
        <span>{project.name}</span>
      </div>
      <div className="">
        <Badge>
          {project.builds.pageInfo.totalCount}{" "}
          {project.builds.pageInfo.totalCount > 1 ? "builds" : "build"}
        </Badge>
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
      <div className="flex flex-col gap-2">
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};
