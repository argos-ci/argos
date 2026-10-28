import type { Account, GitlabProject } from "@/database/models";

import { getGitlabClientForProject } from "./client";
import { formatGlProject } from "./util";

/** How long a GitLab project is trusted before a build syncs it again. */
export const GITLAB_PROJECT_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Sync a GitLab project from its instance, through `account`'s token.
 * Returns `false` when the account can't reach it.
 */
export async function syncGitlabProject(
  gitlabProject: GitlabProject,
  account: Account,
  options: Parameters<typeof getGitlabClientForProject>[2],
): Promise<boolean> {
  const gitlab = await getGitlabClientForProject(
    account,
    gitlabProject,
    options,
  );
  if (!gitlab) {
    return false;
  }
  const glProject = await gitlab.client.Projects.show(gitlab.gitlabProjectId);
  await gitlabProject.$clone().$query().patch(formatGlProject(glProject));
  return true;
}
