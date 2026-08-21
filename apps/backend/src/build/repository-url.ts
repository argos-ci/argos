import { invariant } from "@argos/util/invariant";

import { type Project } from "@/database/models";
import { UnretryableError } from "@/job-core";
import { getOriginRepositoryUrl } from "@/origin/url";

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

  if (project.originRepositoryId) {
    invariant(
      project.originRepository,
      "originRepository relation is expected to be loaded",
      UnretryableError,
    );

    return getOriginRepositoryUrl(project.originRepository);
  }

  return null;
}

/**
 * Get the web URL of a pull request of the repository backing a project.
 *
 * Same expectations as {@link getRepositoryUrl}. GitHub and Origin spell the
 * path the same way.
 */
export function getPullRequestUrl(
  project: Project,
  pullRequest: { number: number },
): string | null {
  const repositoryUrl = getRepositoryUrl(project);
  if (!repositoryUrl) {
    return null;
  }
  return `${repositoryUrl}/pull/${pullRequest.number}`;
}

/** The relations {@link getRepositoryUrl} reads. */
const REPOSITORY_GRAPH =
  "[githubRepository.githubAccount, gitlabProject, originRepository]";

/** Whether a project carries the *whole* graph {@link getRepositoryUrl} needs. */
function hasRepositoryGraph(project: Project): boolean {
  if (project.githubRepositoryId) {
    // The nested account, not just the repository: a project that has been
    // through a permission check carries `githubRepository` alone —
    // `$checkIsPublic` fetches it for its `private` flag — and reading that as
    // "loaded" is what makes `getRepositoryUrl` throw.
    return Boolean(project.githubRepository?.githubAccount);
  }
  if (project.gitlabProjectId) {
    return Boolean(project.gitlabProject);
  }
  return Boolean(project.originRepository);
}

/**
 * Load the graph {@link getRepositoryUrl} needs onto a project.
 *
 * Call this once before a batch of renders that share a project (see
 * `notifyReviewCommentsWentLive`), so {@link fetchRepositoryUrl} answers each of
 * them from the instance instead of querying per render. Loads the complete
 * graph, so it can only ever improve what is on the project.
 */
export async function loadRepositoryGraph(project: Project): Promise<void> {
  if (
    !project.githubRepositoryId &&
    !project.gitlabProjectId &&
    !project.originRepositoryId
  ) {
    return;
  }
  await project.$fetchGraph(REPOSITORY_GRAPH);
}

/**
 * Same as {@link getRepositoryUrl}, for callers holding a project whose
 * repository relations aren't loaded.
 *
 * Fetches into a clone, so this neither depends on nor disturbs the graph the
 * caller happened to load — a half-loaded one is the norm rather than the
 * exception (see {@link hasRepositoryGraph}). The only state it trusts is a
 * *complete* graph, which is what lets {@link loadRepositoryGraph} spare a batch
 * of renders a query each.
 */
export async function fetchRepositoryUrl(
  project: Project,
): Promise<string | null> {
  if (
    !project.githubRepositoryId &&
    !project.gitlabProjectId &&
    !project.originRepositoryId
  ) {
    return null;
  }
  if (hasRepositoryGraph(project)) {
    return getRepositoryUrl(project);
  }
  const richProject = await project.$clone().$fetchGraph(REPOSITORY_GRAPH);
  return getRepositoryUrl(richProject);
}
