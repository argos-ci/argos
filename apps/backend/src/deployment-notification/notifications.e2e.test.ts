import { invariant } from "@argos/util/invariant";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import type {
  Deployment,
  DeploymentNotification,
  GithubPullRequest,
  GithubRepository,
  Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { processDeploymentNotification } from "./notifications";

const {
  commentGithubPrMock,
  createGhCommitStatusMock,
  getInstallationOctokitMock,
  octokitMock,
} = vi.hoisted(() => ({
  commentGithubPrMock: vi.fn(),
  createGhCommitStatusMock: vi.fn(),
  getInstallationOctokitMock: vi.fn(),
  octokitMock: {},
}));

vi.mock("@/github", () => ({
  commentGithubPr: commentGithubPrMock,
  getInstallationOctokit: getInstallationOctokitMock,
}));

vi.mock("@/github/commit-status", () => ({
  createGhCommitStatus: createGhCommitStatusMock,
}));

const commit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const test = base.extend<{
  repository: GithubRepository;
  project: Project;
  pullRequest: GithubPullRequest;
  deployment: Deployment;
  deploymentNotification: DeploymentNotification;
}>({
  repository: async ({}, use) => {
    await setupDatabase();
    const repository = await factory.GithubRepository.create({
      name: "argos",
    });
    const installation = await factory.GithubInstallation.create();
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: installation.id,
    });
    await use(repository);
  },
  project: async ({ repository }, use) => {
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
      name: "docs",
    });
    await use(project);
  },
  pullRequest: async ({ repository }, use) => {
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 42,
      commentId: "123",
    });
    await use(pullRequest);
  },
  deployment: async ({ project, pullRequest }, use) => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      commitSha: commit,
      githubPullRequestId: pullRequest.id,
      slug: "deployment-notification",
      status: "ready",
    });
    await use(deployment);
  },
  deploymentNotification: async ({ deployment }, use) => {
    const deploymentNotification = await factory.DeploymentNotification.create({
      deploymentId: deployment.id,
      type: "success",
    });
    await use(deploymentNotification);
  },
});

describe("processDeploymentNotification", () => {
  beforeEach(() => {
    commentGithubPrMock.mockReset();
    createGhCommitStatusMock.mockReset();
    getInstallationOctokitMock.mockReset();
    getInstallationOctokitMock.mockResolvedValue(octokitMock);
  });

  test("posts the deployment commit status and updates the pull request comment", async ({
    repository,
    deployment,
    deploymentNotification,
  }) => {
    const githubAccount = await repository.$relatedQuery("githubAccount");
    invariant(githubAccount, "github account should exist");

    await processDeploymentNotification(deploymentNotification);

    expect(createGhCommitStatusMock).toHaveBeenCalledWith(octokitMock, {
      owner: githubAccount.login,
      repo: repository.name,
      sha: commit,
      state: "success",
      target_url: deployment.url,
      description: "Deployment ready",
      context: "argos-deploy/docs",
    });
    expect(commentGithubPrMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: githubAccount.login,
        repo: repository.name,
        body: expect.stringContaining(deployment.url),
        octokit: octokitMock,
      }),
    );
  });

  test("posts a pending status for progress notifications", async ({
    repository,
    deployment,
  }) => {
    const deploymentNotification = await factory.DeploymentNotification.create({
      deploymentId: deployment.id,
      type: "progress",
    });
    const githubAccount = await repository.$relatedQuery("githubAccount");
    invariant(githubAccount, "github account should exist");

    await processDeploymentNotification(deploymentNotification);

    expect(createGhCommitStatusMock).toHaveBeenCalledWith(
      octokitMock,
      expect.objectContaining({
        owner: githubAccount.login,
        repo: repository.name,
        sha: commit,
        state: "pending",
        description: "Deployment in progress",
      }),
    );
  });

  test("skips the pull request comment when the deployment has no pull request", async ({
    project,
  }) => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      commitSha: commit,
      githubPullRequestId: null,
      slug: "deployment-without-pr",
    });
    const deploymentNotification = await factory.DeploymentNotification.create({
      deploymentId: deployment.id,
    });

    await processDeploymentNotification(deploymentNotification);

    expect(createGhCommitStatusMock).toHaveBeenCalledOnce();
    expect(commentGithubPrMock).not.toHaveBeenCalled();
  });
});
