import { invariant } from "@argos/util/invariant";

import { type Project } from "@/database/models";
import { UnretryableError } from "@/job-core";

/**
 * Get the web URL of the Git repository backing a project, if any.
 *
 * Expects `githubRepository.githubAccount` / `gitlabProject` to be loaded when
 * the corresponding id is set.
 */
export function getRepositoryUrl(project: Project): string | null {
  if (project.githubRepositoryId) {
    invariant(
      project.githubRepository,
      "githubRepository relation is expected to be loaded",
      UnretryableError,
    );

    invariant(
      project.githubRepository.githubAccount,
      "githubAccount relation not found",
      UnretryableError,
    );

    return `https://github.com/${
      project.githubRepository.githubAccount.login
    }/${project.githubRepository.name}`;
  }

  if (project.gitlabProjectId) {
    invariant(
      project.gitlabProject,
      "gitlabProject relation is expected to be loaded",
      UnretryableError,
    );

    return `https://gitlab.com/${project.gitlabProject.pathWithNamespace}`;
  }

  return null;
}

/**
 * Same as {@link getRepositoryUrl}, for callers holding a project whose
 * repository relations aren't loaded. Loads them into the given instance, so
 * asking a second time (e.g. once per comment of a review) costs no query.
 */
export async function fetchRepositoryUrl(
  project: Project,
): Promise<string | null> {
  if (!project.githubRepositoryId && !project.gitlabProjectId) {
    return null;
  }
  if (!project.githubRepository && !project.gitlabProject) {
    await project.$fetchGraph(
      "[githubRepository.githubAccount, gitlabProject]",
    );
  }
  return getRepositoryUrl(project);
}
