import { TransactionOrKnex, runAfterTransaction } from "@argos-ci/database";
import { Build, BuildNotification } from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";

import { job as buildNotificationJob } from "./job.js";

const getStatsMessage = async (buildId: string) => {
  const stats = await Build.getStats(buildId);
  const parts = [];
  if (stats.changed) {
    parts.push(`${stats.changed} change${stats.changed > 1 ? "s" : ""}`);
  }
  if (stats.failure) {
    parts.push(`${stats.failure} failure${stats.failure > 1 ? "s" : ""}`);
  }
  return parts.join(",");
};

const getNotificationPayload = async (
  buildNotification: BuildNotification
): Promise<{
  state: "pending" | "success" | "error" | "failure";
  description: string;
}> => {
  switch (buildNotification.type) {
    case "queued":
      return {
        state: "pending",
        description: "Build is queued",
      };
    case "progress":
      return {
        state: "pending",
        description: "Build in progress...",
      };
    case "no-diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        state: "success",
        description: statsMessage || "Everything's good!",
      };
    }
    case "diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);

      const { baseScreenshotBucket, compareScreenshotBucket } =
        await buildNotification
          .build!.$query()
          .withGraphJoined("[baseScreenshotBucket, compareScreenshotBucket]");
      const isReferenceBuild =
        baseScreenshotBucket!.commit === compareScreenshotBucket!.commit;

      if (isReferenceBuild) {
        return {
          state: "success",
          description: `${statsMessage} — no validation required`,
        };
      }

      return {
        state: "pending",
        description: `${statsMessage} — waiting for your decision`,
      };
    }
    case "diff-accepted": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        state: "success",
        description: `${statsMessage} — Changes accepted`,
      };
    }
    case "diff-rejected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        state: "failure",
        description: `${statsMessage} — Changes rejected`,
      };
    }
    default:
      throw new Error(`Unknown notification type: ${buildNotification.type}`);
  }
};

export async function pushBuildNotification({
  type,
  buildId,
  trx,
}: {
  type: BuildNotification["type"];
  buildId: BuildNotification["buildId"];
  trx?: TransactionOrKnex;
}) {
  const buildNotification = await BuildNotification.query(trx).insert({
    buildId,
    type,
    jobStatus: "pending",
  });
  runAfterTransaction(trx, () => {
    buildNotificationJob.push(buildNotification.id);
  });
  return buildNotification;
}

export const processBuildNotification = async (
  buildNotification: BuildNotification
) => {
  await buildNotification.$fetchGraph(
    `build.[repository.installations, compareScreenshotBucket]`
  );

  const { build } = buildNotification;

  if (!build) {
    throw new Error("Build not found");
  }

  // Skip sample build
  if (build.number === 0) {
    return null;
  }

  const notification = await getNotificationPayload(buildNotification);
  const owner = await build.repository!.$relatedOwner();

  if (!owner) {
    throw new Error("Owner not found");
  }

  const [installation] = build.repository!.installations!;
  if (!installation) {
    const error = new Error(
      `Installation not found for repository "${build.repository!.id}"`
    );
    // @ts-ignore
    error.retryable = false;
    throw error;
  }

  const octokit = await getInstallationOctokit(installation.id);

  if (!octokit) {
    return null;
  }

  const buildUrl = await build.getUrl();

  try {
    // https://developer.github.com/v3/repos/statuses/
    return await octokit.repos.createCommitStatus({
      owner: owner.login,
      repo: build.repository!.name,
      sha: build.compareScreenshotBucket!.commit,
      state: notification.state,
      target_url: buildUrl,
      description: notification.description, // Short description of the status.
      context: build.name === "default" ? "argos" : `argos/${build.name}`,
    });
  } catch (error: any) {
    // It happens if a push-force occurs before sending the notification, it is not considered as an error
    // No commit found for SHA: xxx
    if (error.status === 422) {
      return null;
    }
    throw error;
  }
};
