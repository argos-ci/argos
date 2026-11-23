import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import {
  afterAll,
  afterEach,
  test as base,
  beforeAll,
  describe,
  expect,
} from "vitest";
import z from "zod";

import { createShortLivedProjectToken } from "@/auth/short-lived-project-token";
import { createGithubRepository } from "@/auth/tokenless/github-actions.test-util";
import { factory, setupDatabase } from "@/database/testing";
import { failUnhandledExceptLoopback } from "@/web/test-util";

import { createBuild } from "../handlers/createBuild";
import { createTestHandlerApp } from "../test-util";

const app = createTestHandlerApp(createBuild);

const BASE = "1".repeat(40);
const HEAD = "2".repeat(40);
const MERGE = "3".repeat(40);
const OTHER = "4".repeat(40);

/**
 * Pull request 7 of argos-ci/argos, whose test merge commit `MERGE` merges
 * `HEAD` into `BASE`. GitHub now reports `currentHead` as its head.
 */
const githubServer = setupServer();
function stubPullRequest(currentHead: string) {
  githubServer.use(
    http.get("https://api.github.com/repos/argos-ci/argos/pulls/7", () =>
      HttpResponse.json({ number: 7, head: { sha: currentHead } }),
    ),
    http.get(
      `https://api.github.com/repos/argos-ci/argos/commits/${MERGE}`,
      () =>
        HttpResponse.json({
          sha: MERGE,
          parents: [{ sha: BASE }, { sha: HEAD }],
        }),
    ),
  );
}

beforeAll(() => {
  z.globalRegistry.clear();
  githubServer.listen({ onUnhandledFrame: failUnhandledExceptLoopback });
});
afterEach(() => {
  githubServer.resetHandlers();
});
afterAll(() => {
  githubServer.close();
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
 * Create a skipped build with a token minted from a GitHub Actions OIDC claim.
 */
async function createSkippedBuild(input: {
  projectId: string;
  pullRequestNumber: number | null;
  commit: string;
  prHeadCommit: string;
}) {
  const { token } = await createShortLivedProjectToken({
    projectId: input.projectId,
    source: "github-actions-oidc",
    sha: input.commit,
    pullRequestNumber: input.pullRequestNumber,
  });
  return request(app)
    .post("/builds")
    .set("Authorization", `Bearer ${token}`)
    .send({
      commit: input.commit,
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
    stubPullRequest(HEAD);
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: 7,
      commit: MERGE,
      prHeadCommit: HEAD,
    });
    expect(res.status).toBe(201);
  });

  test("accepts the head the merge commit was built from after a push", async ({
    projectId,
  }) => {
    stubPullRequest(OTHER);
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: 7,
      commit: MERGE,
      prHeadCommit: HEAD,
    });
    expect(res.status).toBe(201);
  });

  test.for([
    ["an unrelated commit", OTHER],
    ["the base branch commit", BASE],
  ] as const)("refuses %s", async ([, prHeadCommit], { projectId }) => {
    stubPullRequest(HEAD);
    const res = await createSkippedBuild({
      projectId,
      pullRequestNumber: 7,
      commit: MERGE,
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
      commit: MERGE,
      prHeadCommit: HEAD,
    });
    expect(res.status).toBe(401);
  });
});
