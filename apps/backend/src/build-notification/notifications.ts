import { invariant } from "@argos/util/invariant";

import { BuildNotification } from "@/database/models/index.js";
import { UnretryableError } from "@/job-core/index.js";

import { getAggregatedNotification } from "./aggregated.js";
import type { SendNotificationContext } from "./context.js";
import { job as buildNotificationJob } from "./job.js";
import { getNotificationPayload } from "./notification.js";
import { sendGitHubNotification } from "./services/github.js";
import { sendGitLabNotification } from "./services/gitlab.js";

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

  const commit =
    buildNotification.build.prHeadCommit ??
    buildNotification.build.compareScreenshotBucket.commit;

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
  };

  await Promise.all([sendGitHubNotification(ctx), sendGitLabNotification(ctx)]);
}
