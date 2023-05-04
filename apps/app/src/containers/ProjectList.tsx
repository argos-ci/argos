import { FolderPlusIcon } from "@heroicons/react/24/outline";
import { HTMLProps } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Badge } from "@/ui/Badge";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";

const ProjectFragment = graphql(`
  fragment ProjectList_Project on Project {
    id
    name
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

const FakeRouterLink = ({
  to,
  ...props
}: HTMLProps<HTMLDivElement> & { to: string }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    />
  );
};

const ProjectRow = ({ project }: { project: Project }) => {
  return (
    <RouterLink
      key={project.id}
      to={`/${project.account.slug}/${project.name}`}
      className="flex items-center justify-between rounded bg-slate-900/70 p-3 font-medium text-on-light transition hover:bg-slate-900"
    >
      <div className="flex shrink-0 gap-1">
        <FakeRouterLink
          to={`/${project.account.slug}`}
          className="transition hover:text-on hover:brightness-125"
        >
          <span className="flex gap-2">
            <AccountAvatar
              avatar={project.account.avatar}
              size={24}
              className="shrink-0"
            />
            {project.account.name}
          </span>
        </FakeRouterLink>
        <span className="text-on-light">/</span>
        <span className="transition hover:text-on">{project.name}</span>
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
            <FolderPlusIcon />
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
        <div className="mb-4 text-on-light">
          Start by creating a new project.
        </div>
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
