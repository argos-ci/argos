import type { Octokit } from "@octokit/rest";

import { TransactionOrKnex, runAfterTransaction } from "@argos-ci/database";
import {
  Build,
  BuildNotification,
  GithubPullRequest,
} from "@argos-ci/database/models";
import { commentGithubPr, getInstallationOctokit } from "@argos-ci/github";
import { UnretryableError } from "@argos-ci/job-core";
import { createVercelClient } from "@argos-ci/vercel";

import { getCommentBody } from "./comment.js";
import { job as buildNotificationJob } from "./job.js";
import { getStatsMessage } from "./utils.js";

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
  buildNotification: BuildNotification,
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
        `Unknown notification type: ${buildNotification.type}`,
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
  buildNotification: BuildNotification,
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

type Context = {
  buildNotification: BuildNotification;
  build: Build;
  buildUrl: string;
  notification: NotificationPayload;
};

const createCommitStatus = async ({
  buildName,
  buildUrl,
  commit,
  description,
  githubAccountLogin,
  octokit,
  repositoryName,
  state,
}: {
  buildName: string;
  buildUrl: string;
  commit: string;
  description: string;
  githubAccountLogin: string;
  octokit: Octokit;
  repositoryName: string;
  state: GithubNotificationState;
}) => {
  try {
    await octokit.repos.createCommitStatus({
      owner: githubAccountLogin,
      repo: repositoryName,
      sha: commit,
      state,
      target_url: buildUrl,
      description,
      context: buildName === "default" ? "argos" : `argos/${buildName}`,
    });
  } catch (error: any) {
    // It happens if a push-force occurs before sending the notification, it is not considered as an error
    // No commit found for SHA: xxx
    if (error.status === 422) {
      return;
    }

    throw error;
  }
};

const sendGithubNotification = async (ctx: Context) => {
  const { build, buildUrl, notification } = ctx;

  if (!build) {
    throw new UnretryableError("Invariant: no build found");
  }

  const { project, compareScreenshotBucket } = build;

  if (!compareScreenshotBucket) {
    throw new UnretryableError("Invariant: no compare screenshot bucket found");
  }

  if (!project) {
    throw new UnretryableError("Invariant: no project found");
  }

  const { githubRepository } = project;

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

  const createGhComment = async () => {
    if (!project.prCommentEnabled || !build.githubPullRequestId) {
      return;
    }

    const pullRequest = await GithubPullRequest.query().findById(
      build.githubPullRequestId,
    );

    if (!pullRequest || pullRequest.commentDeleted) {
      return;
    }

    const body = await getCommentBody({
      commit: compareScreenshotBucket.commit,
    });
    await commentGithubPr({
      owner: githubAccount.login,
      repo: githubRepository.name,
      body,
      octokit,
      pullRequest,
    });
  };

  await Promise.all([
    createCommitStatus({
      buildName: build.name,
      buildUrl,
      commit: build.prHeadCommit ?? compareScreenshotBucket.commit,
      description: notification.description,
      githubAccountLogin: githubAccount.login,
      octokit,
      repositoryName: githubRepository.name,
      state: notification.githubState,
    }),
    createGhComment(),
  ]);
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
  buildNotification: BuildNotification,
) => {
  await buildNotification.$fetchGraph(
    `build.[project.[githubRepository.[githubAccount,activeInstallation], account], compareScreenshotBucket, vercelCheck.vercelDeployment.vercelProject.activeConfiguration]`,
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
