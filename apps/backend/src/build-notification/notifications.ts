import { invariant } from "@argos/util/invariant";
import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import {
  Build,
  BuildNotification,
  GithubPullRequest,
  GithubRepository,
} from "@/database/models/index.js";
import {
  checkErrorStatus,
  commentGithubPr,
  getInstallationOctokit,
} from "@/github/index.js";
import {
  getGitlabClientFromAccount,
  type GitlabClient,
} from "@/gitlab/index.js";
import { UnretryableError } from "@/job-core/index.js";
import { redisLock } from "@/util/redis/index.js";

import { getAggregatedNotification } from "./aggregated.js";
import { getCommentBody } from "./comment.js";
import { job as buildNotificationJob } from "./job.js";
import { getNotificationPayload, NotificationPayload } from "./notification.js";

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

export type Context = {
  buildNotification: BuildNotification;
  commit: string;
  build: Build;
  buildUrl: string;
  projectUrl: string;
  notification: NotificationPayload;
  aggregatedNotification: NotificationPayload | null;
};

const createGhCommitStatus = async (
  octokit: Octokit,
  params: RestEndpointMethodTypes["repos"]["createCommitStatus"]["parameters"],
) => {
  await redisLock.acquire(
    ["create-github-commit-status", params.owner, params.repo, params.sha],
    async () => {
      try {
        await octokit.repos.createCommitStatus(params);
      } catch (error) {
        // It happens if a push-force occurs before sending the notification, it is not considered as an error
        // No commit found for SHA: xxx
        if (checkErrorStatus(422, error)) {
          return;
        }

        throw error;
      }
    },
  );
};

async function sendGithubNotification(ctx: Context) {
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

  const installation = GithubRepository.pickBestInstallation(githubRepository);

  if (!installation) {
    return;
  }

  const octokit = await getInstallationOctokit(installation);

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
    state: notification.github.state,
    target_url: ctx.buildUrl,
    description: notification.description,
    context: notification.context,
  });

  await createGhComment();

  if (ctx.aggregatedNotification) {
    await createGhCommitStatus(octokit, {
      owner: githubAccount.login,
      repo: githubRepository.name,
      sha: commit,
      state: ctx.aggregatedNotification.github.state,
      target_url: ctx.projectUrl,
      description: ctx.aggregatedNotification.description,
      context: ctx.aggregatedNotification.context,
    });
  }
}

async function setGitLabCommitStatusSafely(input: {
  client: GitlabClient;
  gitlabProjectId: number;
  sha: string;
  state: NotificationPayload["gitlab"]["state"];
  context: string;
  targetUrl: string;
  description: string;
}) {
  try {
    await input.client.Commits.editStatus(
      input.gitlabProjectId,
      input.sha,
      input.state,
      {
        context: input.context,
        targetUrl: input.targetUrl,
        description: input.description,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(
        "Cannot transition status via :run from :running",
      )
    ) {
      // If the status is already running, we can safely ignore this error
      return;
    }
  }
}

const sendGitlabNotification = async (ctx: Context) => {
  const { build, notification } = ctx;
  invariant(build, "no build found", UnretryableError);

  const { project, compareScreenshotBucket } = build;

  invariant(
    compareScreenshotBucket,
    "no compare screenshot bucket found",
    UnretryableError,
  );
  invariant(project, "no project found", UnretryableError);

  const { gitlabProject, account } = project;

  invariant(account, "no account found", UnretryableError);

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

  await setGitLabCommitStatusSafely({
    client,
    gitlabProjectId: gitlabProject.gitlabId,
    sha: ctx.commit,
    state: notification.gitlab.state,
    context: notification.context,
    targetUrl: ctx.buildUrl,
    description: notification.description,
  });

  if (ctx.aggregatedNotification) {
    await setGitLabCommitStatusSafely({
      client,
      gitlabProjectId: gitlabProject.gitlabId,
      sha: ctx.commit,
      state: ctx.aggregatedNotification.gitlab.state,
      context: ctx.aggregatedNotification.context,
      targetUrl: ctx.projectUrl,
      description: ctx.aggregatedNotification.description,
    });
  }
};

export const processBuildNotification = async (
  buildNotification: BuildNotification,
) => {
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

  const isAutoApproved = buildNotification.build.type === "reference";
  const summaryCheckConfig = buildNotification.build.project.summaryCheck;

  const [buildUrl, projectUrl, notification, aggregatedNotification] =
    await Promise.all([
      buildNotification.build.getUrl(),
      buildNotification.build.project.getUrl(),
      getNotificationPayload({
        buildNotification,
        build: buildNotification.build,
      }),
      getAggregatedNotification(
        buildNotification.build.compareScreenshotBucket.commit,
        isAutoApproved,
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

  await Promise.all([sendGithubNotification(ctx), sendGitlabNotification(ctx)]);
};
