import { createContext, useMemo, type ReactNode } from "react";

import { useNonNullable } from "@/util/useNonNullable";

/**
 * The Git repository backing the current project. `url` is its web URL (e.g.
 * `https://github.com/argos-ci/argos`), and is null when the project has no
 * repository — or when the viewer isn't allowed to know of it, which is the case
 * on a public share link opened by someone with no access to the project.
 *
 * Wrapped in an object rather than exposed as a bare `string | null` so a
 * missing provider is distinguishable from a project with no repository: both
 * would otherwise read as null, and a comment surface mounted outside a project
 * route would silently stop linking its commit shas instead of saying so.
 */
interface ProjectRepository {
  url: string | null;
}

const ProjectRepositoryContext = createContext<ProjectRepository | null>(null);

/**
 * Provided once per project route, and consumed wherever content authored about
 * that repository is rendered, so a comment's commit shas link to the commits
 * they name.
 */
export function ProjectRepositoryProvider(props: {
  url: string | null;
  children: ReactNode;
}) {
  const { url, children } = props;
  const value = useMemo(() => ({ url }), [url]);
  return (
    <ProjectRepositoryContext value={value}>
      {children}
    </ProjectRepositoryContext>
  );
}

/**
 * Web URL of the current project's repository, or null when it has none. Use
 * within a project route, where {@link ProjectRepositoryProvider} is always set.
 */
export function useProjectRepositoryUrl(): string | null {
  return useNonNullable(
    ProjectRepositoryContext,
    "Project repository must be provided",
  ).url;
}
