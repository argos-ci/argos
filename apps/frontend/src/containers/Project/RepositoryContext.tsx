import { createContext, use } from "react";

/**
 * Web URL of the Git repository backing the current project (e.g.
 * `https://github.com/argos-ci/argos`), or null when the project has none — or
 * when the viewer isn't allowed to know of it, which is the case on a public
 * share link opened by someone with no access to the project.
 *
 * Provided once per project route and consumed wherever content authored about
 * that repository is rendered, so a comment's commit shas link to the commits
 * they name.
 */
const ProjectRepositoryUrlContext = createContext<string | null>(null);

export const ProjectRepositoryUrlProvider =
  ProjectRepositoryUrlContext.Provider;

export function useProjectRepositoryUrl(): string | null {
  return use(ProjectRepositoryUrlContext);
}
