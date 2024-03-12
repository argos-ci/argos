import { MarkGithubIcon } from "@primer/octicons-react";

import { GitLabColoredLogo } from "./GitLab";

type RepositoryType = "GithubRepository" | "GitlabProject";

const repositoryIcons = {
  GithubRepository: MarkGithubIcon,
  GitlabProject: GitLabColoredLogo,
};

export const getRepositoryIcon = (repositoryType: RepositoryType) => {
  return repositoryIcons[repositoryType];
};

const repositoryLabels = {
  GithubRepository: "GitHub",
  GitlabProject: "GitLab",
};

export const getRepositoryLabel = (repositoryType: RepositoryType) => {
  return repositoryLabels[repositoryType];
};
