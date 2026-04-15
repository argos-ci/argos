import { GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";

import { Link } from "@/ui/Link";
import { Truncable } from "@/ui/Truncable";

type ProjectRepository =
  | {
      url: string;
    }
  | null
  | undefined;

function getGitRefUrl(props: {
  repository: ProjectRepository;
  type: "branch" | "commit";
  value: string;
}) {
  const { repository, type, value } = props;
  if (!repository) {
    return undefined;
  }

  const path = type === "branch" ? "tree" : "commit";
  return `${repository.url.replace(/\/$/, "")}/${path}/${encodeURIComponent(
    value,
  )}`;
}

export function ProjectBranchLink(props: {
  repository: ProjectRepository;
  branch: string;
  className?: string;
}) {
  return (
    <Link
      className={props.className}
      variant="neutral"
      target="_blank"
      href={getGitRefUrl({
        repository: props.repository,
        type: "branch",
        value: props.branch,
      })}
    >
      <GitBranchIcon className="mr-[0.4em] size-3 shrink-0" />
      <Truncable>{props.branch}</Truncable>
    </Link>
  );
}

export function ProjectCommitLink(props: {
  repository: ProjectRepository;
  commit: string;
  className?: string;
}) {
  return (
    <Link
      className={props.className}
      variant="neutral"
      target="_blank"
      href={getGitRefUrl({
        repository: props.repository,
        type: "commit",
        value: props.commit,
      })}
    >
      <GitCommitIcon className="mr-[0.4em] size-3 shrink-0" />
      <span className="truncate">{props.commit.slice(0, 7)}</span>
    </Link>
  );
}
