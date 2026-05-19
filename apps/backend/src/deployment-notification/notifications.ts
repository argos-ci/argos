import { invariant } from "@argos/util/invariant";

import { DeploymentNotification, GithubRepository } from "@/database/models";
import { postGitHubComment } from "@/git-platform/github";
import { getInstallationOctokit } from "@/github";
import { createGhCommitStatus } from "@/github/commit-status";
import { UnretryableError } from "@/job-core";
import parentLogger from "@/logger";

import { job as deploymentNotificationJob } from "./job";
import { getDeploymentNotificationPayload } from "./notification";

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
    "deployment.[project.[githubRepository.[githubAccount,repoInstallations.installation]]]",
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

  const { githubAccount } = githubRepository;

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

  const comment = async () => {
    if (!project.prCommentEnabled) {
      logger.info("PR comment disabled, skipping");
      return;
    }

    if (!deployment.githubPullRequestId) {
      logger.info("No pull request, skipping");
      return;
    }

    await postGitHubComment({
      owner: githubAccount.login,
      repo: githubRepository.name,
      octokit,
      commit: deployment.commitSha,
      githubPullRequestId: deployment.githubPullRequestId,
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
    comment(),
  ]);
}
