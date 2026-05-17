import { invariant } from "@argos/util/invariant";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import * as models from "@/database/models";
import type {
  Build,
  BuildNotification,
  GithubInstallation,
  GithubRepository,
  Project,
  ScreenshotBucket,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import type { SendNotificationContext } from "../context";
import { sendGitHubNotification } from "./github";

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
  installation: GithubInstallation;
  project: Project;
  bucket: ScreenshotBucket;
  build: Build;
  buildNotification: BuildNotification;
  ctx: SendNotificationContext;
}>({
  repository: async ({}, use) => {
    await setupDatabase();
    const repository = await factory.GithubRepository.create({ name: "argos" });
    await use(repository);
  },
  installation: async ({ repository }, use) => {
    const installation = await factory.GithubInstallation.create({
      app: "main" as const,
    });
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: installation.id,
    });
    await use(installation);
  },
  project: async ({ repository, installation }, use) => {
    // installation must be initialized before project so the fixture runs.
    expect(installation.id).toBeTruthy();
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
      name: "frontend",
    });
    await use(project);
  },
  bucket: async ({ project }, use) => {
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit,
      branch: "feature/x",
    });
    await use(bucket);
  },
  build: async ({ project, bucket }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: bucket.id,
      name: "default",
    });
    await use(build);
  },
  buildNotification: async ({ build }, use) => {
    const buildNotification = await factory.BuildNotification.create({
      buildId: build.id,
      type: "diff-detected",
    });
    await use(buildNotification);
  },
  ctx: async ({ build, buildNotification }, use) => {
    // Load build with relations needed by the service.
    const loadedBuild = await models.Build.query()
      .findById(build.id)
      .withGraphFetched(
        "[project.[githubRepository.[githubAccount,repoInstallations.installation]], compareScreenshotBucket]",
      );
    invariant(loadedBuild, "build should exist");
    const ctx: SendNotificationContext = {
      buildNotification,
      build: loadedBuild,
      commit,
      buildUrl: "https://app.argos-ci.com/team/frontend/builds/1",
      projectUrl: "https://app.argos-ci.com/team/frontend",
      notification: {
        description: "Diff detected",
        context: "argos",
        github: { state: "failure" },
        gitlab: { state: "failed" },
      },
      aggregatedNotification: null,
      comment: false,
    };
    await use(ctx);
  },
});

describe("sendGitHubNotification", () => {
  beforeEach(() => {
    commentGithubPrMock.mockReset();
    createGhCommitStatusMock.mockReset();
    createGhRepositoryDispatchMock.mockReset();
    getInstallationOctokitMock.mockReset();
    getInstallationOctokitMock.mockResolvedValue(octokitMock);
  });

  test("posts the commit status and triggers a repository dispatch for the main app", async ({
    repository,
    project,
    build,
    ctx,
  }) => {
    const githubAccount = await repository.$relatedQuery("githubAccount");
    invariant(githubAccount, "github account should exist");

    await sendGitHubNotification(ctx);

    expect(createGhCommitStatusMock).toHaveBeenCalledWith(octokitMock, {
      owner: githubAccount.login,
      repo: repository.name,
      sha: commit,
      state: "failure",
      target_url: ctx.buildUrl,
      description: "Diff detected",
      context: "argos",
    });

    expect(createGhRepositoryDispatchMock).toHaveBeenCalledWith(octokitMock, {
      owner: githubAccount.login,
      repo: repository.name,
      event_type: "argos.build.diff-detected",
      client_payload: {
        argos: {
          type: "build",
          action: "diff-detected",
          build: expect.objectContaining({
            id: build.id,
            name: "default",
            status: "diff-detected",
            commit,
            branch: "feature/x",
            url: ctx.buildUrl,
          }),
          project: {
            id: project.id,
            name: "frontend",
            url: ctx.projectUrl,
          },
        },
      },
    });
  });

  test("does not trigger a repository dispatch for the light app", async ({
    repository,
    ctx,
  }) => {
    // Replace the main installation by a light one.
    await models.GithubRepositoryInstallation.query()
      .where("githubRepositoryId", repository.id)
      .delete();
    const lightInstallation = await factory.GithubInstallation.create({
      app: "light" as const,
    });
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: lightInstallation.id,
    });

    // Reload context with the new installation.
    const reloadedBuild = await models.Build.query()
      .findById(ctx.build.id)
      .withGraphFetched(
        "[project.[githubRepository.[githubAccount,repoInstallations.installation]], compareScreenshotBucket]",
      );
    invariant(reloadedBuild, "build should exist");

    await sendGitHubNotification({ ...ctx, build: reloadedBuild });

    expect(createGhCommitStatusMock).toHaveBeenCalled();
    expect(createGhRepositoryDispatchMock).not.toHaveBeenCalled();
  });
});
