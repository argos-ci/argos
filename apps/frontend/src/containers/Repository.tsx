import { MarkGithubIcon } from "@primer/octicons-react";

import { GitLabColoredLogo } from "./GitLab";
import { CursorOriginLogo } from "./Origin";

type RepositoryType = "GithubRepository" | "GitlabProject" | "OriginRepository";

export const RepositoryIcons: Record<RepositoryType, React.ElementType> = {
  GithubRepository: MarkGithubIcon,
  GitlabProject: GitLabColoredLogo,
  OriginRepository: CursorOriginLogo,
};

type PullRequestType = "GithubPullRequest" | "OriginPullRequest";

export const PullRequestProviderIcons: Record<
  PullRequestType,
  React.ElementType
> = {
  GithubPullRequest: MarkGithubIcon,
  OriginPullRequest: CursorOriginLogo,
};

const repositoryLabels = {
  GithubRepository: "GitHub",
  GitlabProject: "GitLab",
  OriginRepository: "Cursor Origin",
};

export const getRepositoryLabel = (repositoryType: RepositoryType) => {
  return repositoryLabels[repositoryType];
};
