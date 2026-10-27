import type { ProjectSchema } from "@gitbeaker/rest";
import { z } from "zod";

import type { GitlabProject } from "@/database/models";

export const formatGlProject = (glProject: ProjectSchema) => {
  const visibility = z
    .enum(["public", "private", "internal"])
    .parse(glProject.visibility);

  return {
    name: glProject.name,
    path: glProject.path,
    pathWithNamespace: glProject.path_with_namespace,
    visibility,
    defaultBranch: glProject.default_branch,
    gitlabId: glProject.id,
    webUrl: glProject.web_url,
  };
};

/**
 * Get the web URL of a GitLab project.
 *
 * Not built from the account's `gitlabBaseUrl`: on a self-hosted instance it
 * is a proxy that only answers requests carrying `X-Argos-Auth`. Rows stored
 * before `webUrl` existed read null until their next sync, and fall back to
 * gitlab.com meanwhile.
 */
export function getGitlabProjectUrl(gitlabProject: GitlabProject): string {
  return (
    gitlabProject.webUrl ??
    `https://gitlab.com/${gitlabProject.pathWithNamespace}`
  );
}
