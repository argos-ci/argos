import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { formatDeploymentId } from "../services/deployment";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL Build.deployment", () => {
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

  it("returns the latest deployment matching the build commit", async () => {
    const commitSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const compareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit: commitSha,
    });
    await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
    });

    await factory.Deployment.create({
      projectId: project.id,
      commitSha,
      slug: "deployment-older",
      createdAt: "2026-04-10T10:00:00.000Z",
    });
    const latestDeployment = await factory.Deployment.create({
      projectId: project.id,
      commitSha,
      slug: "deployment-latest",
      createdAt: "2026-04-11T10:00:00.000Z",
    });

    await factory.Deployment.create({
      projectId: project.id,
      commitSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      slug: "deployment-other-commit",
      createdAt: "2026-04-12T10:00:00.000Z",
    });
    await factory.Deployment.create({
      commitSha,
      slug: "deployment-other-project",
      createdAt: "2026-04-13T10:00:00.000Z",
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
            build(number: 1) {
              deployment {
                id
                commitSha
                url
              }
            }
          }
        }`,
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.build.deployment).toEqual({
      id: formatDeploymentId(latestDeployment.id),
      commitSha,
      url: latestDeployment.url,
    });
  });

  it("returns the latest deployment matching any build commit sha", async () => {
    const screenshotCommitSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const prHeadCommitSha = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const compareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit: screenshotCommitSha,
    });
    await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
      prHeadCommit: prHeadCommitSha,
    });

    const latestDeployment = await factory.Deployment.create({
      projectId: project.id,
      commitSha: screenshotCommitSha,
      slug: "deployment-latest",
      createdAt: "2026-04-11T10:00:00.000Z",
    });

    await factory.Deployment.create({
      projectId: project.id,
      commitSha: prHeadCommitSha,
      slug: "deployment-older",
      createdAt: "2026-04-10T10:00:00.000Z",
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
            build(number: 1) {
              deployment {
                id
                commitSha
                url
              }
            }
          }
        }`,
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.build.deployment).toEqual({
      id: formatDeploymentId(latestDeployment.id),
      commitSha: screenshotCommitSha,
      url: latestDeployment.url,
    });
  });
});
