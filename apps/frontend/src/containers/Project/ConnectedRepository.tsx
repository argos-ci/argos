import { invariant } from "@argos/util/invariant";
import clsx from "clsx";

import { DocumentType, graphql } from "@/gql";
import { getProjectURL, useProjectParams } from "@/pages/Project/ProjectParams";
import { LinkButton } from "@/ui/Button";
import { Link } from "@/ui/Link";

import { RepositoryIcons } from "../Repository";

const _ProjectFragment = graphql(`
  fragment ConnectedRepository_Project on Project {
    id
    repository {
      __typename
      id
      fullName
      url
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;

/**
 * Whether the project is connected to a GitHub repository.
 *
 * GitHub Actions authentication (tokenless & OIDC) only works for projects
 * connected to a GitHub repository, so a GitLab project is not eligible.
 */
export function isGithubRepositoryConnected(project: Project): boolean {
  return project.repository?.__typename === "GithubRepository";
}

/**
 * Displays the GitHub repository this feature applies to, or explains why the
 * project is not eligible when no GitHub repository is connected.
 */
export function ConnectedRepository(props: {
  project: Project;
  className?: string;
}) {
  const { project, className } = props;
  const { repository } = project;

  if (repository?.__typename === "GithubRepository") {
    const RepoIcon = RepositoryIcons[repository.__typename];
    return (
      <div className={clsx("flex flex-col gap-1.5", className)}>
        <div className="text-low text-sm font-medium">
          Applies to GitHub Actions runs from this repository:
        </div>
        <div className="flex items-center gap-2 rounded-sm border p-4">
          <RepoIcon className="size-6 shrink-0" />
          <Link
            className="font-semibold"
            href={repository.url}
            target="_blank"
            variant="neutral"
          >
            {repository.fullName}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "text-low rounded-sm border border-dashed p-4 text-sm",
        className,
      )}
    >
      {repository
        ? "This authentication is only available for projects connected to a GitHub repository, but this project is connected to a GitLab repository."
        : "No GitHub repository is connected to this project. Connect one to use this authentication for your GitHub Actions runs."}
    </div>
  );
}

/**
 * Secondary button linking to the Git settings, used to connect (or change) the
 * project's repository when it is not eligible for GitHub Actions authentication.
 */
export function ConnectRepositoryButton(props: { project: Project }) {
  const params = useProjectParams();
  invariant(params);
  return (
    <LinkButton
      variant="secondary"
      href={`${getProjectURL(params)}/settings/git`}
    >
      {props.project.repository
        ? "Manage Git repository"
        : "Connect a Git repository"}
    </LinkButton>
  );
}
