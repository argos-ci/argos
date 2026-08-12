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
 * repository relations aren't loaded.
 *
 * Fetches into a clone rather than into the caller's instance, and without
 * consulting what is already on it. A project that has been through a permission
 * check carries a *partially* loaded graph — `$checkIsPublic` fetches
 * `githubRepository` alone, for its `private` flag — so "the relation is already
 * there" says nothing about `githubAccount` being there with it, and skipping the
 * fetch on that basis throws. Loading unconditionally into a copy keeps this
 * independent of whatever the caller happened to load, and leaves that graph
 * alone for whoever else reads it.
 */
export async function fetchRepositoryUrl(
  project: Project,
): Promise<string | null> {
  if (!project.githubRepositoryId && !project.gitlabProjectId) {
    return null;
  }
  const richProject = await project
    .$clone()
    .$fetchGraph("[githubRepository.githubAccount, gitlabProject]");
  return getRepositoryUrl(richProject);
}
