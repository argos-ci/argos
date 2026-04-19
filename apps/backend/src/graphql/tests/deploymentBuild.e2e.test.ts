import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL Deployment.build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  let userAccount: Account;
  let project: Project;

  beforeEach(async () => {
    userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    project = await factory.Project.create({
      accountId: userAccount.id,
    });
  });

  it("returns the latest build matching the deployment commit", async () => {
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

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `{
          project(accountSlug: "${userAccount.slug}", projectName: "${project.name}") {
            deployments {
              edges {
                commitSha
                build {
                  id
                  number
                }
              }
            }
          }
        }`,
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

  it("matches builds by prHeadCommit when needed", async () => {
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

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `{
          project(accountSlug: "${userAccount.slug}", projectName: "${project.name}") {
            deployments {
              edges {
                build {
                  id
                  number
                }
              }
            }
          }
        }`,
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.deployments.edges[0].build).toEqual({
      id: latestBuild.id,
      number: 1,
    });
  });
});
