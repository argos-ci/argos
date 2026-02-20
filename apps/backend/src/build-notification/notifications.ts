import { invariant } from "@argos/util/invariant";

import { BuildNotification } from "@/database/models";
import { UnretryableError } from "@/job-core";

import { getAggregatedNotification } from "./aggregated";
import type { SendNotificationContext } from "./context";
import { job as buildNotificationJob } from "./job";
import { getNotificationPayload } from "./notification";
import { sendGitHubNotification } from "./services/github";
import { sendGitLabNotification } from "./services/gitlab";

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

  invariant(buildNotification.build, "No build found", UnretryableError);
  invariant(
    buildNotification.build.compareScreenshotBucket,
    "No compareScreenshotBucket found",
    UnretryableError,
  );
  invariant(
    buildNotification.build.project,
    "No project found",
    UnretryableError,
  );

  const commit = (() => {
    // In merge queue, we never notify the PR head commit but the merge queue itself.
    if (
      !buildNotification.build.mergeQueue &&
      buildNotification.build.prHeadCommit
    ) {
      return buildNotification.build.prHeadCommit;
    }
    return buildNotification.build.compareScreenshotBucket.commit;
  })();

  const summaryCheckConfig = buildNotification.build.project.summaryCheck;

  const [buildUrl, projectUrl, notification, aggregatedNotification] =
    await Promise.all([
      buildNotification.build.getUrl(),
      buildNotification.build.project.getUrl(),
      getNotificationPayload({
        buildNotification,
        build: buildNotification.build,
      }),
      getAggregatedNotification({
        projectId: buildNotification.build.projectId,
        commit: buildNotification.build.compareScreenshotBucket.commit,
        buildType: buildNotification.build.type,
        summaryCheckConfig,
      }),
    ]);

  const ctx: SendNotificationContext = {
    buildNotification,
    commit,
    build: buildNotification.build,
    buildUrl,
    projectUrl,
    notification,
    aggregatedNotification,
    comment: !buildNotification.build.mergeQueue,
  };

  await Promise.all([sendGitHubNotification(ctx), sendGitLabNotification(ctx)]);
}
