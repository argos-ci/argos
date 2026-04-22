import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import type { Account, GithubAccount, Project, User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const test = base.extend<{
  account: Account;
  githubAccount: GithubAccount;
  project: Project;
  user: User;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  githubAccount: async ({}, use) => {
    const githubAccount = await factory.GithubAccount.extend(() => ({
      type: "user",
    })).create();
    await use(githubAccount);
  },
  account: async ({ user, githubAccount }, use) => {
    const account = await factory.UserAccount.create({
      userId: user.id,
      githubAccountId: githubAccount.id,
    });
    await account.$fetchGraph("user");
    invariant(account.user, "User account should have a user");
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
    });
    await use(project);
  },
});

async function queryDeployments(args: {
  account: Account;
  project: Project;
  user: User;
  query: string;
}) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: args.user,
      account: args.account,
    },
  );

  return request(app)
    .post("/graphql")
    .send({
      query: `{
      project(accountSlug: "${args.account.slug}", projectName: "${args.project.name}") {
        deployments {
          edges {
            ${args.query}
          }
        }
      }
    }`,
    });
}

describe("GraphQL Deployment.build", () => {
  test("returns the latest build matching the deployment commit", async ({
    account,
    project,
    user,
  }) => {
    const commitSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const olderCompareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit: commitSha,
    });
    await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: olderCompareScreenshotBucket.id,
      number: 1,
      createdAt: "2026-04-10T10:00:00.000Z",
    });

    const latestCompareScreenshotBucket = await factory.ScreenshotBucket.create(
      {
        projectId: project.id,
        commit: commitSha,
      },
    );
    const latestBuild = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: latestCompareScreenshotBucket.id,
      number: 2,
      createdAt: "2026-04-11T10:00:00.000Z",
    });

    await factory.Build.create({
      projectId: project.id,
      prHeadCommit: commitSha,
      number: 3,
      createdAt: "2026-04-09T10:00:00.000Z",
    });

    await factory.Build.create({
      projectId: project.id,
      number: 4,
      createdAt: "2026-04-12T10:00:00.000Z",
    });

    await factory.Deployment.create({
      projectId: project.id,
      commitSha,
      slug: "deployment-latest-build",
    });

    const res = await queryDeployments({
      account,
      project,
      user,
      query: `
        commitSha
        build {
          id
          number
        }
      `,
    });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.deployments.edges[0]).toMatchObject({
      commitSha,
      build: {
        id: latestBuild.id,
        number: 2,
      },
    });
  });

  test("matches builds by prHeadCommit when needed", async ({
    account,
    project,
    user,
  }) => {
    const commitSha = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const latestBuild = await factory.Build.create({
      projectId: project.id,
      prHeadCommit: commitSha,
      number: 1,
      createdAt: "2026-04-11T10:00:00.000Z",
    });

    await factory.Build.create({
      projectId: project.id,
      prHeadCommit: commitSha,
      number: 2,
      createdAt: "2026-04-10T10:00:00.000Z",
    });

    await factory.Deployment.create({
      projectId: project.id,
      commitSha,
      slug: "deployment-pr-head-commit",
    });

    const res = await queryDeployments({
      account,
      project,
      user,
      query: `
        build {
          id
          number
        }
      `,
    });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.deployments.edges[0].build).toEqual({
      id: latestBuild.id,
      number: 1,
    });
  });

  test("resolves builds for multiple deployments in the same query", async ({
    account,
    project,
    user,
  }) => {
    const firstCommitSha = "cccccccccccccccccccccccccccccccccccccccc";
    const secondCommitSha = "dddddddddddddddddddddddddddddddddddddddd";

    const firstCompareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit: firstCommitSha,
    });
    const firstBuild = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: firstCompareScreenshotBucket.id,
      number: 1,
      createdAt: "2026-04-10T10:00:00.000Z",
    });

    const secondBuild = await factory.Build.create({
      projectId: project.id,
      prHeadCommit: secondCommitSha,
      number: 2,
      createdAt: "2026-04-11T10:00:00.000Z",
    });

    await factory.Deployment.create({
      projectId: project.id,
      commitSha: firstCommitSha,
      slug: "deployment-first-build",
      createdAt: "2026-04-10T11:00:00.000Z",
    });
    await factory.Deployment.create({
      projectId: project.id,
      commitSha: secondCommitSha,
      slug: "deployment-second-build",
      createdAt: "2026-04-11T11:00:00.000Z",
    });

    const res = await queryDeployments({
      account,
      project,
      user,
      query: `
        commitSha
        build {
          id
          number
        }
      `,
    });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.deployments.edges).toEqual([
      {
        commitSha: secondCommitSha,
        build: {
          id: secondBuild.id,
          number: 2,
        },
      },
      {
        commitSha: firstCommitSha,
        build: {
          id: firstBuild.id,
          number: 1,
        },
      },
    ]);
  });
});
