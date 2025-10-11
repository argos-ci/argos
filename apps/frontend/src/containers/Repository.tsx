import { MarkGithubIcon } from "@primer/octicons-react";

import { GitLabColoredLogo } from "./GitLab";

type RepositoryType = "GithubRepository" | "GitlabProject";

export const RepositoryIcons: Record<RepositoryType, React.ElementType> = {
  GithubRepository: MarkGithubIcon,
  GitlabProject: GitLabColoredLogo,
};

const repositoryLabels = {
  GithubRepository: "GitHub",
  GitlabProject: "GitLab",
};

export const getRepositoryLabel = (repositoryType: RepositoryType) => {
  return repositoryLabels[repositoryType];
};
