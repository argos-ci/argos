import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import {
  Build,
  BuildNotification,
  GithubPullRequest,
} from "@/database/models/index.js";
import { commentGithubPr, getInstallationOctokit } from "@/github/index.js";
import { UnretryableError } from "@/job-core/index.js";
import { createVercelClient } from "@/vercel/index.js";

import { getCommentBody } from "./comment.js";
import { job as buildNotificationJob } from "./job.js";
import { getGitlabClientFromAccount } from "@/gitlab/index.js";
import { getNotificationPayload, NotificationPayload } from "./notification.js";
import { getAggregatedNotification } from "./aggregated.js";
import { invariant } from "@/util/invariant.js";

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

type Context = {
  buildNotification: BuildNotification;
  commit: string;
  build: Build;
  buildUrl: string;
  projectUrl: string;
  notification: NotificationPayload;
  aggregatedNotification: NotificationPayload | null;
};

const AGGREGATED_CONTEXT = "argos/summary";

const getStatusContext = (buildName: string) =>
  buildName === "default" ? "argos" : `argos/${buildName}`;

const createGhCommitStatus = async (
  octokit: Octokit,
  params: RestEndpointMethodTypes["repos"]["createCommitStatus"]["parameters"],
) => {
  try {
    await octokit.repos.createCommitStatus(params);
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
  const { build, notification, commit } = ctx;

  invariant(build, "No build found", UnretryableError);

  const { project, compareScreenshotBucket } = build;

  invariant(
    compareScreenshotBucket,
    "No compare screenshot bucket found",
    UnretryableError,
  );

  invariant(project, "No project found", UnretryableError);

  const { githubRepository } = project;

  if (!githubRepository) {
    return;
  }

  const githubAccount = githubRepository.githubAccount;

  invariant(githubAccount, "No github account found", UnretryableError);

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

  await createGhCommitStatus(octokit, {
    owner: githubAccount.login,
    repo: githubRepository.name,
    sha: commit,
    state: notification.githubState,
    target_url: ctx.buildUrl,
    description: notification.description,
    context: getStatusContext(build.name),
  });

  await createGhComment();

  if (ctx.aggregatedNotification) {
    await createGhCommitStatus(octokit, {
      owner: githubAccount.login,
      repo: githubRepository.name,
      sha: commit,
      state: ctx.aggregatedNotification.githubState,
      target_url: ctx.projectUrl,
      description: ctx.aggregatedNotification.description,
      context: AGGREGATED_CONTEXT,
    });
  }
};

const sendGitlabNotification = async (ctx: Context) => {
  const { build, notification } = ctx;

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

  const { gitlabProject, account } = project;

  if (!account) {
    throw new UnretryableError("Invariant: no account found");
  }

  if (!account.gitlabAccessToken) {
    return;
  }

  if (!gitlabProject) {
    return;
  }

  const client = await getGitlabClientFromAccount(account);

  if (!client) {
    return;
  }

  await client.Commits.editStatus(
    gitlabProject.gitlabId,
    ctx.commit,
    notification.gitlabState,
    {
      context: getStatusContext(build.name),
      targetUrl: ctx.buildUrl,
      description: notification.description,
    },
  );

  if (ctx.aggregatedNotification) {
    await client.Commits.editStatus(
      gitlabProject.gitlabId,
      ctx.commit,
      ctx.aggregatedNotification.gitlabState,
      {
        context: AGGREGATED_CONTEXT,
        targetUrl: ctx.projectUrl,
        description: ctx.aggregatedNotification.description,
      },
    );
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

  // Aggregated notification is not relevant for Vercel
};

export const processBuildNotification = async (
  buildNotification: BuildNotification,
) => {
  await buildNotification.$fetchGraph(
    `build.[project.[gitlabProject, githubRepository.[githubAccount,activeInstallation], account], compareScreenshotBucket, vercelCheck.vercelDeployment.vercelProject.activeConfiguration]`,
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

  const isReference = buildNotification.build.type === "reference";
  const summaryCheckConfig = buildNotification.build.project.summaryCheck;

  const [buildUrl, projectUrl, notification, aggregatedNotification] =
    await Promise.all([
      buildNotification.build.getUrl(),
      buildNotification.build.project.getUrl(),
      getNotificationPayload(buildNotification, isReference),
      getAggregatedNotification(
        buildNotification.build.compareScreenshotBucket.commit,
        isReference,
        summaryCheckConfig,
      ),
    ]);

  const ctx: Context = {
    buildNotification,
    commit,
    build: buildNotification.build,
    buildUrl,
    projectUrl,
    notification,
    aggregatedNotification,
  };

  await Promise.all([
    sendGithubNotification(ctx),
    sendGitlabNotification(ctx),
    sendVercelNotification(ctx),
  ]);
};
