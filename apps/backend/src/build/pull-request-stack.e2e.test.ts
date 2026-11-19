import { test as baseTest, beforeEach, describe, expect } from "vitest";

import type {
  GithubPullRequest,
  GithubRepository,
  Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  getLatestPullRequestBuilds,
  getPullRequestStack,
} from "./pull-request-stack";

const test = baseTest.extend<{
  repository: GithubRepository;
  project: Project;
}>({
  repository: async ({}, use) => {
    await use(await factory.GithubRepository.create());
  },
  project: async ({ repository }, use) => {
    await use(
      await factory.Project.create({ githubRepositoryId: repository.id }),
    );
  },
});

function createPullRequest(
  repository: GithubRepository,
  input: {
    number: number;
    headRef: string;
    baseRef: string;
    state?: "open" | "closed";
    headFromFork?: boolean;
  },
) {
  return factory.PullRequest.create({
    githubRepositoryId: repository.id,
    headFromFork: false,
    ...input,
  });
}

function numbers(pullRequests: GithubPullRequest[]) {
  return pullRequests.map((pullRequest) => pullRequest.number);
}

describe("#getPullRequestStack", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("follows the stack both ways, from its top down to its base branch", async ({
    repository,
  }) => {
    await createPullRequest(repository, {
      number: 1,
      headRef: "one",
      baseRef: "main",
    });
    const middle = await createPullRequest(repository, {
      number: 2,
      headRef: "two",
      baseRef: "one",
    });
    await createPullRequest(repository, {
      number: 3,
      headRef: "three",
      baseRef: "two",
    });

    const stack = await getPullRequestStack(middle);
    expect(numbers(stack.pullRequests as GithubPullRequest[])).toEqual([
      3, 2, 1,
    ]);
    expect(stack.baseBranch).toBe("main");
  });

  test("leaves out closed pull requests, fork branches and other repositories", async ({
    repository,
  }) => {
    const pullRequest = await createPullRequest(repository, {
      number: 2,
      headRef: "two",
      baseRef: "one",
    });
    await createPullRequest(repository, {
      number: 1,
      headRef: "one",
      baseRef: "main",
      state: "closed",
    });
    await createPullRequest(repository, {
      number: 4,
      headRef: "one",
      baseRef: "main",
      headFromFork: true,
    });
    const otherRepository = await factory.GithubRepository.create();
    await createPullRequest(otherRepository, {
      number: 5,
      headRef: "three",
      baseRef: "two",
    });

    const stack = await getPullRequestStack(pullRequest);
    expect(numbers(stack.pullRequests as GithubPullRequest[])).toEqual([2]);
    expect(stack.baseBranch).toBe("one");
  });

  test("stops going up where two pull requests build on the same one", async ({
    repository,
  }) => {
    const pullRequest = await createPullRequest(repository, {
      number: 1,
      headRef: "one",
      baseRef: "main",
    });
    await createPullRequest(repository, {
      number: 2,
      headRef: "two",
      baseRef: "one",
    });
    await createPullRequest(repository, {
      number: 3,
      headRef: "three",
      baseRef: "one",
    });

    const stack = await getPullRequestStack(pullRequest);
    expect(numbers(stack.pullRequests as GithubPullRequest[])).toEqual([1]);
  });

  test("ends when the pull requests merge into each other", async ({
    repository,
  }) => {
    const pullRequest = await createPullRequest(repository, {
      number: 1,
      headRef: "one",
      baseRef: "two",
    });
    await createPullRequest(repository, {
      number: 2,
      headRef: "two",
      baseRef: "one",
    });

    const stack = await getPullRequestStack(pullRequest);
    expect(numbers(stack.pullRequests as GithubPullRequest[])).toEqual([1, 2]);
  });
});

describe("#getLatestPullRequestBuilds", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("picks the latest build of the same suite for each pull request", async ({
    repository,
    project,
  }) => {
    const [below, above] = await Promise.all([
      createPullRequest(repository, {
        number: 1,
        headRef: "one",
        baseRef: "main",
      }),
      createPullRequest(repository, {
        number: 2,
        headRef: "two",
        baseRef: "one",
      }),
    ]);
    const createBuild = (input: {
      githubPullRequestId: string;
      name?: string;
      projectId?: string;
    }) =>
      factory.Build.create({
        projectId: project.id,
        name: "default",
        mode: "ci",
        ...input,
      });

    const build = await createBuild({ githubPullRequestId: above.id });
    await createBuild({ githubPullRequestId: below.id });
    const latest = await createBuild({ githubPullRequestId: below.id });
    await createBuild({ githubPullRequestId: below.id, name: "storybook" });
    const otherProject = await factory.Project.create({
      githubRepositoryId: repository.id,
    });
    await createBuild({
      githubPullRequestId: below.id,
      projectId: otherProject.id,
    });

    const builds = await getLatestPullRequestBuilds({
      build,
      pullRequests: [above, below],
    });
    expect(builds.get(above.id)?.id).toBe(build.id);
    expect(builds.get(below.id)?.id).toBe(latest.id);
  });
});
