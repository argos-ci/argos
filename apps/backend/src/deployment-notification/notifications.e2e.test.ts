import { invariant } from "@argos/util/invariant";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import * as models from "@/database/models";
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
  createGhRepositoryDispatchMock,
  getInstallationOctokitMock,
  octokitMock,
} = vi.hoisted(() => ({
  commentGithubPrMock: vi.fn(),
  createGhCommitStatusMock: vi.fn(),
  createGhRepositoryDispatchMock: vi.fn(),
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

vi.mock("@/github/repository-dispatch", () => ({
  createGhRepositoryDispatch: createGhRepositoryDispatchMock,
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
    createGhRepositoryDispatchMock.mockReset();
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

  test("triggers a repository dispatch event for the main app", async ({
    repository,
    project,
    deployment,
    deploymentNotification,
    pullRequest,
  }) => {
    const githubAccount = await repository.$relatedQuery("githubAccount");
    invariant(githubAccount, "github account should exist");

    await processDeploymentNotification(deploymentNotification);

    expect(createGhRepositoryDispatchMock).toHaveBeenCalledWith(octokitMock, {
      owner: githubAccount.login,
      repo: repository.name,
      event_type: "argos.deployment.success",
      client_payload: {
        argos: {
          type: "deployment",
          action: "success",
          deployment: {
            id: deployment.id,
            status: "ready",
            url: deployment.url,
            environment: "preview",
            branch: "main",
            commit,
            prNumber: pullRequest.number,
          },
          project: {
            id: project.id,
            name: project.name,
          },
        },
      },
    });
  });

  test("skips the repository dispatch event for the light app", async ({
    project,
    deploymentNotification,
  }) => {
    // Replace the main installation with a light one.
    const lightInstallation = await factory.GithubInstallation.create({
      app: "light",
    });
    invariant(project.githubRepositoryId, "githubRepositoryId should exist");
    await models.GithubRepositoryInstallation.query()
      .where("githubRepositoryId", project.githubRepositoryId)
      .delete();
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: project.githubRepositoryId,
      githubInstallationId: lightInstallation.id,
    });

    await processDeploymentNotification(deploymentNotification);

    expect(createGhCommitStatusMock).toHaveBeenCalled();
    expect(createGhRepositoryDispatchMock).not.toHaveBeenCalled();
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
