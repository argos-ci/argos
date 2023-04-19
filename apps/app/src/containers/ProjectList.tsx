import { HTMLProps } from "react";
import { Link, Link as RouterLink, useNavigate } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";

const ProjectFragment = graphql(`
  fragment ProjectList_Project on Project {
    id
    name
    account {
      id
      slug
      name
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
      <div className="flex flex-shrink-0 gap-1">
        <FakeRouterLink
          to={`/${project.account.slug}`}
          className="transition hover:text-on hover:brightness-125"
        >
          <span className="flex gap-2">
            <AccountAvatar
              account={project.account}
              size={24}
              className="flex-shrink-0"
            />
            {project.account.slug}
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

const Group = (props: { label: string; children: React.ReactNode }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-on-light">{props.label}</div>
      <div className="flex flex-col gap-1">{props.children}</div>
    </div>
  );
};

export const ProjectList = (props: { projects: ProjectFragmentType[] }) => {
  const projects = useFragment(ProjectFragment, props.projects);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="mb-2 text-2xl font-medium">No projects yet!</div>
        <div className="mb-4 text-on-light">
          Start by importing a Git repository.
        </div>
        <Button>
          {(buttonProps) => (
            <Link to="new" {...buttonProps}>
              Create a new Project
            </Link>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Group label="Projects">
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} />
        ))}
      </Group>
    </div>
  );
};
