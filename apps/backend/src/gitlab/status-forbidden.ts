import { invariant } from "@argos/util/invariant";

import config from "@/config";
import type { Project } from "@/database/models";
import { sendNotification } from "@/notification";
import { getRedisClient } from "@/util/redis/client";

import { getGitlabProjectUrl } from "./util";

/**
 * Claim the right to email the owners of `projectId` for the coming week.
 * Losing the key to a Redis flush only costs one extra email.
 */
async function claimStatusForbiddenNotification(
  projectId: string,
): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.set(
    `gitlab-status-forbidden-notified.${projectId}`,
    "1",
    { NX: true, EX: 7 * 24 * 60 * 60 },
  );
  return result === "OK";
}

/**
 * Email the account owners that GitLab refuses the commit statuses of
 * `project`. Statuses are set by background jobs, so without it nobody learns
 * why the Argos status is missing from their pipelines.
 *
 * A protected branch makes GitLab refuse the statuses of some branches and
 * accept the others, so a status that goes through doesn't end the incident.
 * Owners get at most one email a week instead, for as long as it lasts.
 */
export async function notifyGitLabStatusForbidden(input: {
  project: Project;
  branch: string;
}) {
  const { project, branch } = input;
  const { account, gitlabProject } = project;
  invariant(account, "account relation not loaded");
  invariant(gitlabProject, "gitlabProject relation not loaded");

  if (!(await claimStatusForbiddenNotification(project.id))) {
    return;
  }

  const [ownerIds, projectUrl] = await Promise.all([
    account.$getOwnerIds(),
    project.getUrl(),
  ]);
  await sendNotification({
    type: "gitlab_status_forbidden",
    data: {
      project: { name: project.name, url: projectUrl },
      gitlabProject: {
        path: gitlabProject.pathWithNamespace,
        url: getGitlabProjectUrl(gitlabProject),
      },
      branch,
      settingsURL: new URL(
        `/${account.slug}/settings/integrations#gitlab`,
        config.get("server.url"),
      ).href,
    },
    recipients: ownerIds,
  });
}
