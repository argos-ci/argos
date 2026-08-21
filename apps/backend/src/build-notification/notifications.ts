import { invariant } from "@argos/util/invariant";

import { BuildNotification } from "@/database/models";
import { UnretryableError } from "@/job-core";
import { redisLock } from "@/util/redis";

import { getAggregatedNotificationPayload } from "./aggregated";
import type { SendNotificationContext } from "./context";
import { job as buildNotificationJob } from "./job";
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
import {
  getOriginNotificationContext,
  postOriginNotificationCheckRun,
  postOriginNotificationComment,
  type SendOriginNotificationContext,
} from "./services/origin";

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
    `build.[project.[gitlabProject, githubRepository.[githubAccount,repoInstallations.installation], originRepository.installation, account], compareScreenshotBucket]`,
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

  const [notification, githubCtx, gitlabCtx, originCtx] = await Promise.all([
    getNotificationPayload({
      buildNotification,
      build,
    }),
    getGitHubNotificationContext(ctx),
    getGitLabNotificationContext(ctx),
    getOriginNotificationContext(ctx),
  ]);

  const shouldComment = !build.mergeQueue && project.prCommentEnabled;

  await Promise.all([
    ...(githubCtx
      ? [
          postGitHubNotificationCommitStatus(githubCtx, notification),
          shouldComment && postGitHubNotificationComment(githubCtx),
        ]
      : []),
    gitlabCtx && postGitLabNotificationCommitStatus(gitlabCtx, notification),
    ...(originCtx
      ? [
          // The build is the attempt: a new build on the same commit and
          // context is a retry, not an update of the previous run.
          postOriginNotificationCheckRun(originCtx, notification, {
            externalId: build.id,
            startedAt: build.createdAt,
          }),
          shouldComment && postOriginNotificationComment(originCtx),
        ]
      : []),
    sendAggregatedNotification({ ctx, githubCtx, gitlabCtx, originCtx }),
  ]);
}

/**
 * Send the aggregated notification that groups all notifications relative to this commit.
 */
async function sendAggregatedNotification(args: {
  ctx: SendNotificationContext;
  githubCtx: SendGitHubNotificationContext | null;
  gitlabCtx: SendGitLabNotificationContext | null;
  originCtx: SendOriginNotificationContext | null;
}) {
  const {
    ctx: { project, commit, build },
    githubCtx,
    gitlabCtx,
    originCtx,
  } = args;

  // If no Git provider is available.
  if (!githubCtx && !gitlabCtx && !originCtx) {
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
        originCtx &&
          // The summary spans every build of the commit, so the commit is its
          // identity: it is always an update of the same run.
          postOriginNotificationCheckRun(originCtx, notification, {
            externalId: `${commit}-summary`,
            startedAt: null,
          }),
      ]);
    },
  );
}
