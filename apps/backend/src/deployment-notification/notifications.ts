import { invariant } from "@argos/util/invariant";

import { DeploymentNotification, GithubRepository } from "@/database/models";
import { getCommentBody } from "@/git-platform/comment";
import { commentGithubPr, getInstallationOctokit } from "@/github";
import { createGhCommitStatus } from "@/github/commit-status";
import { createGhRepositoryDispatch } from "@/github/repository-dispatch";
import { UnretryableError } from "@/job-core";
import parentLogger from "@/logger";

import { job as deploymentNotificationJob } from "./job";
import { getDeploymentNotificationPayload } from "./notification";
import { getDeploymentRepositoryDispatch } from "./repository-dispatch";

export async function pushDeploymentNotification({
  type,
  deploymentId,
}: {
  type: DeploymentNotification["type"];
  deploymentId: DeploymentNotification["deploymentId"];
}) {
  const deploymentNotification = await DeploymentNotification.query().insert({
    deploymentId,
    type,
    jobStatus: "pending",
  });
  await deploymentNotificationJob.push(deploymentNotification.id);
  return deploymentNotification;
}

export async function processDeploymentNotification(
  deploymentNotification: DeploymentNotification,
) {
  const logger = parentLogger.child({
    category: "deployment-notifications",
    deploymentNotificationId: deploymentNotification.id,
  });

  await deploymentNotification.$fetchGraph(
    "deployment.[project.[githubRepository.[githubAccount,repoInstallations.installation]], pullRequest]",
  );

  invariant(
    deploymentNotification.deployment,
    "No deployment found",
    UnretryableError,
  );

  const { deployment } = deploymentNotification;

  const { project } = deployment;
  invariant(project, "No project found", UnretryableError);

  const { githubRepository } = project;

  if (!githubRepository) {
    logger.info("No GitHub repository found, skipping");
    return;
  }

  const githubAccount = githubRepository.githubAccount;

  invariant(githubAccount, "No github account found", UnretryableError);

  const installation = GithubRepository.pickBestInstallation(githubRepository);

  if (!installation) {
    logger.info("No GitHub installation found, skipping");
    return;
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    logger.info("No Octokit available, skipping");
    return;
  }

  const notification = getDeploymentNotificationPayload({
    deploymentNotification,
    project,
  });

  const updatePullRequestComment = async () => {
    if (!project.prCommentEnabled) {
      logger.info("PR comment disabled, skipping");
      return;
    }

    if (!deployment.pullRequest) {
      logger.info("No pull request, skipping");
      return;
    }

    if (deployment.pullRequest.commentDeleted) {
      logger.info("Comment deleted, skipping");
      return;
    }

    const body = await getCommentBody({
      commit: deployment.commitSha,
    });

    await commentGithubPr({
      owner: githubAccount.login,
      repo: githubRepository.name,
      body,
      octokit,
      pullRequest: deployment.pullRequest,
    });
  };

  const dispatchRepositoryEvent = async () => {
    // Only the main app has the `contents: write` permission required by the
    // GitHub repository dispatch API.
    if (installation.app !== "main") {
      logger.info("Installation app is not main, skipping repository dispatch");
      return;
    }
    const dispatch = getDeploymentRepositoryDispatch({
      deploymentNotification,
      deployment,
      project,
    });
    await createGhRepositoryDispatch(octokit, {
      owner: githubAccount.login,
      repo: githubRepository.name,
      event_type: dispatch.event_type,
      client_payload: dispatch.client_payload,
    });
  };

  logger.info("Creating status and comment");
  await Promise.all([
    createGhCommitStatus(octokit, {
      owner: githubAccount.login,
      repo: githubRepository.name,
      sha: deployment.commitSha,
      state: notification.github.state,
      target_url: deployment.url,
      description: notification.description,
      context: notification.context,
    }),
    updatePullRequestComment(),
    dispatchRepositoryEvent(),
  ]);
}
