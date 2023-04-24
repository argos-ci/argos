import { TransactionOrKnex, runAfterTransaction } from "@argos-ci/database";
import { Build, BuildNotification } from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";
import { UnretryableError } from "@argos-ci/job-core";

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
  return parts.join(", ");
};

type NotificationState = "pending" | "success" | "error" | "failure";

const getNotificationState = (
  buildType: Build["type"],
  state: NotificationState
) => {
  // Reference builds are always successful
  if (buildType === "reference") return "success";
  return state;
};

const getNotificationPayload = async (
  buildNotification: BuildNotification
): Promise<{
  state: NotificationState;
  description: string;
}> => {
  const buildType = buildNotification.build!.type;
  switch (buildNotification.type) {
    case "queued":
      return {
        state: getNotificationState(buildType, "pending"),
        description: "Build is queued",
      };
    case "progress":
      return {
        state: getNotificationState(buildType, "pending"),
        description: "Build in progress...",
      };
    case "no-diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      const description = (() => {
        if (!statsMessage) {
          if (buildType === "reference") return "Used as new baseline";
          return "Everything's good!";
        }
        if (buildType === "reference")
          return `${statsMessage} — used a new baseline`;
        return `${statsMessage} — no change`;
      })();
      return {
        state: getNotificationState(buildType, "success"),
        description,
      };
    }
    case "diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      const description = (() => {
        if (buildType === "reference") {
          return `${statsMessage} — used as new baseline`;
        }
        return `${statsMessage} — waiting for your decision`;
      })();

      return {
        state: getNotificationState(buildType, "pending"),
        description,
      };
    }
    case "diff-accepted": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        state: getNotificationState(buildType, "success"),
        description: `${statsMessage} — changes approved`,
      };
    }
    case "diff-rejected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        state: getNotificationState(buildType, "failure"),
        description: `${statsMessage} — changes rejected`,
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
    `build.[project.githubRepository.[githubAccount,activeInstallation], compareScreenshotBucket]`
  );

  const { build } = buildNotification;

  if (!build) {
    throw new UnretryableError("Invariant: no build found");
  }

  if (!build.compareScreenshotBucket) {
    throw new UnretryableError("Invariant: no compare screenshot bucket found");
  }

  if (!build.project) {
    throw new UnretryableError("Invariant: no project found");
  }

  if (!build.project.githubRepository) {
    throw new UnretryableError("Invariant: no repository found");
  }

  const githubAccount = build.project.githubRepository.githubAccount;

  if (!githubAccount) {
    throw new UnretryableError("Invariant: no github account found");
  }

  const installation = build.project.githubRepository.activeInstallation;

  if (!installation) {
    return null;
  }

  const notification = await getNotificationPayload(buildNotification);
  const octokit = await getInstallationOctokit(installation.id);

  if (!octokit) {
    return null;
  }

  const buildUrl = await build.getUrl();

  try {
    // https://developer.github.com/v3/repos/statuses/
    return await octokit.repos.createCommitStatus({
      owner: githubAccount.login,
      repo: build.project.githubRepository.name,
      sha: build.compareScreenshotBucket.commit,
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
