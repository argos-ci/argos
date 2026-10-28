#!/usr/bin/env node
import { invariant } from "@argos/util/invariant";

import { GitlabProject } from "@/database/models";
import logger from "@/logger";

import { GITLAB_PROJECT_SYNC_INTERVAL, syncGitlabProject } from "../sync";

/**
 * Sync every stale GitLab project now, instead of on its project's next build.
 *
 * Run once after the instance isolation migration: the rows it split are
 * private until synced, and a project that never builds again would keep them
 * that way. A row none of its accounts can reach stays as it is.
 */
const gitlabProjects = await GitlabProject.query()
  .where(
    "updatedAt",
    "<",
    new Date(Date.now() - GITLAB_PROJECT_SYNC_INTERVAL).toISOString(),
  )
  .withGraphFetched("projects.account");

let count = 0;
for (const gitlabProject of gitlabProjects) {
  invariant(gitlabProject.projects, "projects not fetched");
  try {
    for (const project of gitlabProject.projects) {
      invariant(project.account, "account not fetched");
      // "manual": a sweep would otherwise email the owners of every account
      // whose GitLab token has expired.
      const synced = await syncGitlabProject(gitlabProject, project.account, {
        mode: "manual",
      });
      if (synced) {
        count++;
        break;
      }
    }
  } catch (error) {
    logger.warn(
      { error, gitlabProjectId: gitlabProject.id },
      "Failed to sync GitLab project",
    );
  }
}
logger.info(`${count} of ${gitlabProjects.length} GitLab projects synced`);

// The database pool would hold the process open otherwise.
process.exit(0);
