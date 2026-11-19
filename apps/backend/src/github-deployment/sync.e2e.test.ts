import { invariant } from "@argos/util/invariant";
import { RequestError } from "@octokit/request-error";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import {
  DeploymentAlias,
  type Deployment,
  type GithubPullRequest,
  type GithubRepository,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { syncGitHubDeployment } from "./sync";

const { octokit, getInstallationOctokitMock } = vi.hoisted(() => {
  const octokit = {
    repos: {
      createDeployment: vi.fn(),
      createDeploymentStatus: vi.fn(),
    },
    rest: { pulls: { get: vi.fn() } },
  };
  return {
    octokit,
    getInstallationOctokitMock: vi.fn(async () => octokit),
  };
});

vi.mock("@/github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/github")>()),
  getInstallationOctokit: getInstallationOctokitMock,
}));

const commit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const prHeadCommit = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const test = base.extend<{
  repository: GithubRepository;
  project: Project;
  pullRequest: GithubPullRequest;
  deployment: Deployment;
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
      headFromFork: false,
    });
    await use(pullRequest);
  },
  deployment: async ({ project, pullRequest }, use) => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "preview",
      branch: "feature",
      commitSha: commit,
      prHeadCommit,
      githubPullRequestId: pullRequest.id,
      slug: "docs-abc123",
      status: "ready",
      authSource: "project-token",
    });
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "docs-feature-acme",
      type: "branch",
    });
    await use(deployment);
  },
});

async function getOwner(repository: GithubRepository) {
  const githubAccount = await repository.$relatedQuery("githubAccount");
  invariant(githubAccount, "github account should exist");
  return githubAccount.login;
}

describe("syncGitHubDeployment", () => {
  beforeEach(() => {
    octokit.repos.createDeployment.mockReset();
    octokit.repos.createDeploymentStatus.mockReset();
    octokit.rest.pulls.get.mockReset();
    octokit.repos.createDeployment.mockResolvedValue({ data: { id: 1234 } });
  });

  test("creates the GitHub deployment on the pull request head commit", async ({
    repository,
    deployment,
  }) => {
    const owner = await getOwner(repository);

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).toHaveBeenCalledWith({
      owner,
      repo: "argos",
      ref: prHeadCommit,
      environment: "docs/preview",
      production_environment: false,
      auto_merge: false,
      required_contexts: [],
    });
    expect(octokit.repos.createDeploymentStatus).toHaveBeenCalledWith({
      owner,
      repo: "argos",
      deployment_id: 1234,
      state: "success",
      environment_url: deployment.url,
      auto_inactive: false,
    });
    await expect(deployment.$query()).resolves.toMatchObject({
      githubDeploymentId: "1234",
    });
  });

  test("creates one GitHub deployment when two syncs run at once", async ({
    deployment,
  }) => {
    await Promise.all([
      syncGitHubDeployment(deployment.id),
      syncGitHubDeployment(deployment.id),
    ]);

    expect(octokit.repos.createDeployment).toHaveBeenCalledOnce();
    expect(octokit.repos.createDeploymentStatus).toHaveBeenCalledTimes(2);
  });

  test("adds a status to the GitHub deployment it already created", async ({
    deployment,
  }) => {
    await deployment.$query().patch({ status: "pending" });
    await syncGitHubDeployment(deployment.id);
    await deployment.$query().patch({ status: "ready" });
    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).toHaveBeenCalledOnce();
    expect(
      octokit.repos.createDeploymentStatus.mock.calls.map(
        ([params]) => params.state,
      ),
    ).toEqual(["in_progress", "success"]);
  });

  test("marks the GitHub deployment inactive once another deployment takes its alias", async ({
    deployment,
  }) => {
    await deployment.$query().patch({ githubDeploymentId: "1234" });
    const next = await factory.Deployment.create({
      projectId: deployment.projectId,
      branch: deployment.branch,
      authSource: "project-token",
    });
    await DeploymentAlias.query()
      .where({ deploymentId: deployment.id })
      .patch({ deploymentId: next.id });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).not.toHaveBeenCalled();
    expect(octokit.repos.createDeploymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ deployment_id: 1234, state: "inactive" }),
    );
    expect(
      octokit.repos.createDeploymentStatus.mock.calls[0]?.[0],
    ).not.toHaveProperty("environment_url");
  });

  test("keeps a production deployment current while it holds the production domains", async ({
    project,
  }) => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "production",
      authSource: "github-actions-oidc",
    });
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "docs.example.com",
      type: "domain",
    });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "docs/production",
        production_environment: true,
      }),
    );
    expect(octokit.repos.createDeploymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "success",
        environment_url: "https://docs.example.com/",
      }),
    );
  });

  test("creates no GitHub deployment once the project turns them off", async ({
    project,
    deployment,
  }) => {
    await project.$query().patch({ githubDeploymentEnabled: false });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).not.toHaveBeenCalled();
    expect(octokit.repos.createDeploymentStatus).not.toHaveBeenCalled();
  });

  test("still updates the GitHub deployments created before it was turned off", async ({
    project,
    deployment,
  }) => {
    await project.$query().patch({ githubDeploymentEnabled: false });
    await deployment.$query().patch({ githubDeploymentId: "1234" });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).not.toHaveBeenCalled();
    expect(octokit.repos.createDeploymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ deployment_id: 1234, state: "success" }),
    );
  });

  test("never reports a deployment authenticated tokenless", async ({
    deployment,
  }) => {
    await deployment.$query().patch({ authSource: "github-actions-tokenless" });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).not.toHaveBeenCalled();
    expect(octokit.repos.createDeploymentStatus).not.toHaveBeenCalled();
  });

  test("never reports a deployment of a fork's pull request", async ({
    deployment,
    pullRequest,
  }) => {
    await pullRequest.$query().patch({ headFromFork: true });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeployment).not.toHaveBeenCalled();
  });

  test("asks GitHub whether the pull request is a fork's before the pull request job does", async ({
    deployment,
    pullRequest,
  }) => {
    await pullRequest.$query().patch({ headFromFork: null });
    octokit.rest.pulls.get.mockResolvedValue({
      data: {
        title: "Fix bug",
        head: { ref: "feature", repo: { id: 2 } },
        base: { ref: "main", sha: commit, repo: { id: 1 } },
        state: "open",
        created_at: new Date().toISOString(),
        closed_at: null,
        merged_at: null,
      },
    });

    await syncGitHubDeployment(deployment.id);

    expect(octokit.rest.pulls.get).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 42 }),
    );
    expect(octokit.repos.createDeployment).not.toHaveBeenCalled();
  });

  test("skips the deployment when the installation lacks the deployments permission", async ({
    deployment,
  }) => {
    octokit.repos.createDeployment.mockRejectedValue(
      new RequestError("Resource not accessible by integration", 403, {
        request: {
          method: "POST",
          url: "https://api.github.com/repos/acme/argos/deployments",
          headers: {},
        },
      }),
    );

    await syncGitHubDeployment(deployment.id);

    expect(octokit.repos.createDeploymentStatus).not.toHaveBeenCalled();
    await expect(deployment.$query()).resolves.toMatchObject({
      githubDeploymentId: null,
    });
  });
});
