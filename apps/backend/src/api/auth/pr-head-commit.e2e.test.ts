import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { createShortLivedProjectToken } from "@/auth/short-lived-project-token";
import {
  createGithubRepository,
  setupGithubServer,
  stubPullRequest,
} from "@/auth/tokenless/github-actions.test-util";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { createBuild } from "../handlers/createBuild";
import { createTestHandlerApp } from "../test-util";

const app = createTestHandlerApp(createBuild);

const BASE = "1".repeat(40);
const HEAD = "2".repeat(40);
const MERGE = "3".repeat(40);
const OTHER = "4".repeat(40);

/**
 * Pull request 7, whose test merge commit `MERGE` merges `HEAD` into `BASE`.
 * GitHub now reports `currentHead` as its head.
 */
function stubPullRequest7(currentHead: string) {
  stubPullRequest({
    number: 7,
    head: currentHead,
    mergeCommit: MERGE,
    parents: [BASE, HEAD],
  });
}

setupRedis();
setupGithubServer();

beforeAll(() => {
  z.globalRegistry.clear();
});

const test = base.extend<{ projectId: string }>({
  projectId: async ({}, use) => {
    await setupDatabase();
    const repository = await createGithubRepository();
    const account = await factory.UserAccount.create();
    const project = await factory.Project.create({
      accountId: account.id,
      githubRepositoryId: repository.id,
      githubActionsOidcEnabled: true,
    });
    await use(project.id);
  },
});

/**
 * Create a skipped build for `MERGE` with a token minted from a GitHub Actions
 * OIDC claim on it.
 */
async function createSkippedBuild(input: {
  projectId: string;
  pullRequestNumber: number | null;
  prHeadCommit: string;
}) {
  const { token } = await createShortLivedProjectToken({
    projectId: input.projectId,
    source: "github-actions-oidc",
    sha: MERGE,
    pullRequestNumber: input.pullRequestNumber,
  });
  return request(app)
    .post("/builds")
    .set("Authorization", `Bearer ${token}`)
    .send({
      commit: MERGE,
      branch: "feature",
      prNumber: 7,
      prHeadCommit: input.prHeadCommit,
      skipped: true,
      screenshots: [],
    });
}

describe("prHeadCommit of a commit-bound token", () => {
  test("accepts the head of the pull request the token was minted for", async ({
    projectId,
  }) => {
    stubPullRequest7(HEAD);
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: 7,
      prHeadCommit: HEAD,
    });
    expect(res.status).toBe(201);
  });

  test("accepts the head the merge commit was built from after a push", async ({
    projectId,
  }) => {
    stubPullRequest7(OTHER);
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: 7,
      prHeadCommit: HEAD,
    });
    expect(res.status).toBe(201);
  });

  test.for([
    ["an unrelated commit", OTHER],
    ["the base branch commit", BASE],
  ] as const)("refuses %s", async ([, prHeadCommit], { projectId }) => {
    stubPullRequest7(HEAD);
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: 7,
      prHeadCommit,
    });
    expect(res.status).toBe(401);
  });

  test("refuses any other commit from a token minted outside a pull request", async ({
    projectId,
  }) => {
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: null,
      prHeadCommit: HEAD,
    });
    expect(res.status).toBe(401);
  });
});
