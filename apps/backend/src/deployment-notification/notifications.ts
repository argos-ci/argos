import { DeploymentNotification, GithubRepository } from "@/database/models";
import { getDeploymentPreferredUrl } from "@/deployment/url";
import { postGitHubComment } from "@/git-platform/github";
import { getInstallationOctokit } from "@/github";
import { githubDeploymentJob } from "@/github-deployment/job";
import { createGhCommitStatus } from "@/github/commit-status";
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
  await Promise.all([
    deploymentNotificationJob.push(deploymentNotification.id),
    githubDeploymentJob.push(deploymentId),
  ]);
  return deploymentNotification;
}

export async function processDeploymentNotification(
  deploymentNotification: DeploymentNotification,
) {
  const logger = parentLogger.child({
    category: "deployment-notifications",
    deploymentNotificationId: deploymentNotification.id,
  });

  const { deployment } = await deploymentNotification.$fetchGraph(
    "deployment.[aliases,project.[githubRepository.[githubAccount,repoInstallations.installation]]]",
  );
  const { project, aliases: deploymentAliases } = deployment;

  const { githubRepository } = project;

  if (!githubRepository) {
    logger.info("No GitHub repository found, skipping");
    return;
  }

  const { githubAccount } = githubRepository;

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

  const status = async () => {
    // The host of an external deployment reports its own status.
    if (deployment.externalUrl) {
      logger.info("External deployment, skipping status");
      return;
    }

    await createGhCommitStatus(octokit, {
      owner: githubAccount.login,
      repo: githubRepository.name,
      // A pull request only shows the statuses of its head commit, and a
      // deployment built on GitHub's test-merge commit would report where no
      // one sees it. The comment keeps `commitSha`, the commit builds key it on.
      sha: deployment.prHeadCommit ?? deployment.commitSha,
      state: notification.github.state,
      target_url: getDeploymentPreferredUrl({
        url: deployment.url,
        aliases: deploymentAliases,
      }),
      description: notification.description,
      context: notification.context,
    });
  };

  logger.info("Creating status and comment");
  await Promise.all([status(), comment()]);
}
