import { invariant } from "@argos/util/invariant";

import { BuildNotification } from "@/database/models";
import { UnretryableError } from "@/job-core";
import { redisLock } from "@/util/redis";

import { getAggregatedNotificationPayload } from "./aggregated";
import type { SendNotificationContext } from "./context";
import { job as buildNotificationJob } from "./job";
import { isLatestBuildNotification } from "./latest";
import { getNotificationPayload } from "./notification";
import {
  getGitHubNotificationContext,
  postGitHubNotificationComment,
  postGitHubNotificationCommitStatus,
  type SendGitHubNotificationContext,
} from "./services/github";
import {
  getGitLabNotificationContext,
  postGitLabNotificationCommitStatus,
  type SendGitLabNotificationContext,
} from "./services/gitlab";

export async function pushBuildNotification({
  type,
  buildId,
}: {
  type: BuildNotification["type"];
  buildId: BuildNotification["buildId"];
}) {
  const buildNotification = await BuildNotification.query().insert({
    buildId,
    type,
    jobStatus: "pending",
  });
  await buildNotificationJob.push(buildNotification.id);
  return buildNotification;
}

export async function processBuildNotification(
  buildNotification: BuildNotification,
) {
  await buildNotification.$fetchGraph(
    `build.[project.[gitlabProject, githubRepository.[githubAccount,repoInstallations.installation], account], compareScreenshotBucket]`,
  );

  const { build } = buildNotification;
  invariant(build, "No build found", UnretryableError);

  const { project, compareScreenshotBucket } = build;
  invariant(
    compareScreenshotBucket,
    "No compare screenshot bucket found",
    UnretryableError,
  );
  invariant(project, "No project found", UnretryableError);

  const commit = (() => {
    // In merge queue, we never notify the PR head commit but the merge queue itself.
    if (!build.mergeQueue && build.prHeadCommit) {
      return build.prHeadCommit;
    }
    return compareScreenshotBucket.commit;
  })();

  const ctx: SendNotificationContext = {
    buildNotification,
    build,
    compareScreenshotBucket,
    project,
    commit,
  };

  const [notification, githubCtx, gitlabCtx] = await Promise.all([
    getNotificationPayload({
      buildNotification,
      build,
    }),
    getGitHubNotificationContext(ctx),
    getGitLabNotificationContext(ctx),
  ]);

  const shouldComment = !build.mergeQueue && project.prCommentEnabled;

  // Re-check just before posting: another notification may have been enqueued
  // while we were preparing the payload. If so, bail out and let the newer
  // notification's job post the up-to-date status.
  if (!(await isLatestBuildNotification(buildNotification))) {
    return;
  }

  await Promise.all([
    ...(githubCtx
      ? [
          postGitHubNotificationCommitStatus(githubCtx, notification),
          shouldComment && postGitHubNotificationComment(githubCtx),
        ]
      : []),
    gitlabCtx && postGitLabNotificationCommitStatus(gitlabCtx, notification),
    sendAggregatedNotification({ ctx, githubCtx, gitlabCtx }),
  ]);
}

/**
 * Send the aggregated notification that groups all notifications relative to this commit.
 */
async function sendAggregatedNotification(args: {
  ctx: SendNotificationContext;
  githubCtx: SendGitHubNotificationContext | null;
  gitlabCtx: SendGitLabNotificationContext | null;
}) {
  const {
    ctx: { project, commit, build },
    githubCtx,
    gitlabCtx,
  } = args;

  // If neither GitHub or GitLab is available.
  if (!githubCtx && !gitlabCtx) {
    return;
  }

  await redisLock.coalesce(
    ["send-aggregated-notification", project.id, commit],
    async () => {
      const notification = await getAggregatedNotificationPayload({
        project,
        commit,
        buildType: build.type,
        summaryCheckConfig: project.summaryCheck,
      });

      if (!notification) {
        return;
      }

      await Promise.all([
        githubCtx &&
          postGitHubNotificationCommitStatus(githubCtx, notification),
        gitlabCtx &&
          postGitLabNotificationCommitStatus(gitlabCtx, notification),
      ]);
    },
  );
}
