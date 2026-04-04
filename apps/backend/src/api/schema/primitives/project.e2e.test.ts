import { test as base, describe, expect } from "vitest";

import type { GithubInstallation, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { serializeProject } from "./project";

const test = base.extend<{
  factory: typeof factory;
  githubProject: Project;
  lightGithubInstallation: GithubInstallation;
  lightGithubProject: Project;
  gitlabBackedProject: Project;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  githubProject: async ({ factory }, use) => {
    const repository = await factory.GithubRepository.create({
      defaultBranch: "develop",
    });
    const installation = await factory.GithubInstallation.create({
      app: "main",
    });
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: installation.id,
    });
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
      defaultBaseBranch: null,
    });
    await use(project);
  },
  lightGithubInstallation: async ({ factory }, use) => {
    const installation = await factory.GithubInstallation.create({
      app: "light",
    });
    await use(installation);
  },
  lightGithubProject: async ({ factory, lightGithubInstallation }, use) => {
    const repository = await factory.GithubRepository.create({
      defaultBranch: "trunk",
    });
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: lightGithubInstallation.id,
    });
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
      defaultBaseBranch: "release",
    });
    await use(project);
  },
  gitlabBackedProject: async ({ factory }, use) => {
    const gitlabProject = await factory.GitlabProject.create({
      defaultBranch: "production",
    });
    const project = await factory.Project.create({
      githubRepositoryId: null,
      gitlabProjectId: gitlabProject.id,
      defaultBaseBranch: null,
    });
    await use(project);
  },
});

describe("api/schema/primitives/project", () => {
  test("serializes a GitHub project with remote content access from the main app", async ({
    githubProject,
  }) => {
    await expect(serializeProject(githubProject)).resolves.toMatchObject({
      id: githubProject.id,
      name: githubProject.name,
      defaultBaseBranch: "develop",
      hasRemoteContentAccess: true,
    });
  });

  test("serializes a GitHub project without remote content access for the light app", async ({
    lightGithubProject,
  }) => {
    await expect(serializeProject(lightGithubProject)).resolves.toMatchObject({
      id: lightGithubProject.id,
      name: lightGithubProject.name,
      defaultBaseBranch: "release",
      hasRemoteContentAccess: false,
    });
  });

  test("serializes a GitLab project using the GitLab default branch", async ({
    gitlabBackedProject,
  }) => {
    await expect(serializeProject(gitlabBackedProject)).resolves.toMatchObject({
      id: gitlabBackedProject.id,
      name: gitlabBackedProject.name,
      defaultBaseBranch: "production",
      hasRemoteContentAccess: false,
    });
  });
});
