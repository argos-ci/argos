import type { Octokit } from "@octokit/rest";

import { TransactionOrKnex, runAfterTransaction } from "@argos-ci/database";
import {
  Build,
  BuildNotification,
  ScreenshotBucket,
} from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";
import { UnretryableError } from "@argos-ci/job-core";
import { createVercelClient } from "@argos-ci/vercel";

import { PullRequest } from "../../database/src/models/PullRequest.js";
import { getRedisLock } from "../../web/src/redis/index.js";
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

enum GithubNotificationState {
  Pending = "pending",
  Success = "success",
  Error = "error",
  Failure = "failure",
}

enum VercelConclusion {
  Neutral = "neutral",
  Succeeded = "succeeded",
  Canceled = "canceled",
  Failed = "failed",
  Skipped = "skipped",
}

enum VercelStatus {
  Completed = "completed",
  Running = "running",
}

const getNotificationStatus = (
  buildNotification: BuildNotification
): {
  githubState: GithubNotificationState;
  vercelStatus: VercelStatus | null;
  vercelConclusion: VercelConclusion | null;
} => {
  const buildType = buildNotification.build!.type;
  const isReference = buildType === "reference";
  switch (buildNotification.type) {
    case "queued": {
      return {
        githubState: GithubNotificationState.Pending,
        vercelStatus: VercelStatus.Running,
        vercelConclusion: null,
      };
    }
    case "progress": {
      return {
        githubState: GithubNotificationState.Pending,
        vercelStatus: VercelStatus.Running,
        vercelConclusion: null,
      };
    }
    case "no-diff-detected": {
      return {
        githubState: GithubNotificationState.Success,
        vercelStatus: VercelStatus.Completed,
        vercelConclusion: VercelConclusion.Succeeded,
      };
    }
    case "diff-detected": {
      return {
        githubState: isReference
          ? GithubNotificationState.Success
          : GithubNotificationState.Failure,
        vercelStatus: VercelStatus.Completed,
        vercelConclusion: isReference
          ? VercelConclusion.Succeeded
          : VercelConclusion.Failed,
      };
    }
    case "diff-accepted": {
      return {
        githubState: GithubNotificationState.Success,
        vercelStatus: null,
        vercelConclusion: null,
      };
    }
    case "diff-rejected": {
      return {
        githubState: GithubNotificationState.Failure,
        vercelStatus: null,
        vercelConclusion: null,
      };
    }
    default: {
      throw new UnretryableError(
        `Unknown notification type: ${buildNotification.type}`
      );
    }
  }
};

type NotificationPayload = {
  description: string;
  githubState: GithubNotificationState;
  vercelStatus: VercelStatus | null;
  vercelConclusion: VercelConclusion | null;
};

const getNotificationPayload = async (
  buildNotification: BuildNotification
): Promise<NotificationPayload> => {
  const buildType = buildNotification.build!.type;
  switch (buildNotification.type) {
    case "queued":
      return {
        ...getNotificationStatus(buildNotification),
        description: "Build is queued",
      };
    case "progress":
      return {
        ...getNotificationStatus(buildNotification),
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
        ...getNotificationStatus(buildNotification),
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
        ...getNotificationStatus(buildNotification),
        description,
      };
    }
    case "diff-accepted": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        ...getNotificationStatus(buildNotification),
        description: `${statsMessage} — changes approved`,
      };
    }
    case "diff-rejected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        ...getNotificationStatus(buildNotification),
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

const getPrCommentMessage = async ({
  builds,
}: {
  builds: Build[];
}): Promise<string> => {
  const aggregateStatuses = await getAggregateStatuses(builds);
  const buildRows = await Promise.all(
    builds.map(async (build, index) => {
      const [stats, url] = await Promise.all([
        // Build.getStats(build.id),
        getStatsMessage(build.id),
        build.getUrl(),
      ]);
      return `| ${build.name} | ${aggregateStatuses[index]} | ${stats} | [Inspect](${url}) |`;
    })
  );
  return [
    `| Build name | Status | Details | Inspect |`,
    `| :--------- | :----- | :------ | :------ |`,
    ...buildRows.sort(),
  ].join("\n");
};

const createOrUpdatePrComment = async ({
  build,
  owner,
  repo,
  octokit,
}: {
  build: Build;
  owner: string;
  repo: string;
  octokit: Octokit;
}) => {
  try {
    const pullRequest = await build.$relatedQuery("pullRequest");

    const lock = await getRedisLock();
    await lock.acquire(pullRequest.id, async () => {
      const builds = await ScreenshotBucket.relatedQuery<Build>("builds").where(
        { commit: build.compareScreenshotBucket!.commit }
      );
      const commentMessage = await getPrCommentMessage({ builds });

      if (pullRequest.commentId) {
        await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: pullRequest.commentId,
          body: commentMessage,
        });
        return;
      }

      const { data } = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullRequest.number,
        body: commentMessage,
      });
      await pullRequest.$query().patch({ commentId: data.id });
      return;
    });
  } catch (error: any) {
    // The comment has been deleted by a user
    if (error.status === 404) {
      return;
    }
    throw error;
  }
};

const getAggregateStatuses = async (builds: Build[]) => {
  const buildIds = builds.map((build) => build.id);
  const statuses = await Build.getStatuses(builds);
  const conclusions = await Build.getConclusions(buildIds, statuses);
  const reviewStatuses = await Build.getReviewStatuses(buildIds, conclusions);
  return builds.map((_build, index) => {
    if (reviewStatuses[index]) return reviewStatuses[index];
    if (conclusions[index]) return conclusions[index];
    return statuses[index];
  });
};

type Context = {
  buildNotification: BuildNotification;
  build: Build;
  buildUrl: string;
  notification: NotificationPayload;
};

const sendGithubNotification = async (ctx: Context) => {
  const { build, buildUrl, notification } = ctx;

  if (!build) {
    throw new UnretryableError("Invariant: no build found");
  }

  if (!build.compareScreenshotBucket) {
    throw new UnretryableError("Invariant: no compare screenshot bucket found");
  }

  if (!build.project) {
    throw new UnretryableError("Invariant: no project found");
  }

  const githubRepository = build.project.githubRepository;

  if (!githubRepository) {
    return;
  }

  const githubAccount = githubRepository.githubAccount;

  if (!githubAccount) {
    throw new UnretryableError("Invariant: no github account found");
  }

  const installation = githubRepository.activeInstallation;

  if (!installation) {
    return;
  }

  const octokit = await getInstallationOctokit(installation.id);

  if (!octokit) {
    return;
  }

  try {
    // https://developer.github.com/v3/repos/statuses/
    const commitStatus = await octokit.repos.createCommitStatus({
      owner: githubAccount.login,
      repo: githubRepository.name,
      sha: build.compareScreenshotBucket.commit,
      state: notification.githubState,
      target_url: buildUrl,
      description: notification.description, // Short description of the status.
      context: build.name === "default" ? "argos" : `argos/${build.name}`,
    });

    if (build.project.prCommentEnabled) {
      await createOrUpdatePrComment({
        build: build,
        owner: githubAccount.login,
        repo: githubRepository.name,
        octokit,
      });
    }

    return commitStatus;
  } catch (error: any) {
    // It happens if a push-force occurs before sending the notification, it is not considered as an error
    // No commit found for SHA: xxx
    if (error.status === 422) {
      return null;
    }

    throw error;
  }
};

const sendVercelNotification = async (ctx: Context) => {
  const { build, buildUrl, notification } = ctx;

  if (!build) {
    throw new UnretryableError("Invariant: no build found");
  }

  // If the build has no vercel check, we don't send a notification
  if (!build.vercelCheck) {
    return;
  }

  if (!build.vercelCheck.vercelDeployment) {
    throw new UnretryableError("Invariant: no vercel deployment found");
  }

  if (!build.vercelCheck.vercelDeployment.vercelProject) {
    throw new UnretryableError("Invariant: no vercel project found");
  }

  const configuration =
    build.vercelCheck.vercelDeployment.vercelProject.activeConfiguration;

  // If the project has no active configuration (or token), we don't send a notification
  if (!configuration?.vercelAccessToken) {
    return;
  }

  const client = createVercelClient({
    accessToken: configuration.vercelAccessToken,
  });

  await client.updateCheck({
    teamId: configuration.vercelTeamId,
    deploymentId: build.vercelCheck.vercelDeployment.vercelId,
    checkId: build.vercelCheck.vercelId,
    detailsUrl: buildUrl,
    name: notification.description,
    externalId: build.id,
    ...(notification.vercelStatus ? { status: notification.vercelStatus } : {}),
    ...(notification.vercelConclusion
      ? { conclusion: notification.vercelConclusion }
      : {}),
  });
};

export const processBuildNotification = async (
  buildNotification: BuildNotification
) => {
  await buildNotification.$fetchGraph(
    `build.[project.[githubRepository.[githubAccount,activeInstallation], account], compareScreenshotBucket, vercelCheck.vercelDeployment.vercelProject.activeConfiguration]`
  );

  if (!buildNotification.build) {
    throw new UnretryableError("Invariant: no build found");
  }

  const [buildUrl, notification] = await Promise.all([
    buildNotification.build.getUrl(),
    getNotificationPayload(buildNotification),
  ]);

  const ctx: Context = {
    buildNotification,
    build: buildNotification.build,
    buildUrl,
    notification,
  };

  await Promise.all([sendGithubNotification(ctx), sendVercelNotification(ctx)]);
};
