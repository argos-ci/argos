import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { formatDeploymentId } from "../services/deployment";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL queryDeployments", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  let userAccount: Account;
  let teamAccount: Account;
  let project: Project;

  beforeEach(async () => {
    userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    teamAccount = await factory.TeamAccount.create();
    await teamAccount.$fetchGraph("team");
    project = await factory.Project.create({
      accountId: teamAccount.id,
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });
  });

  it("should list deployments sorted by creation date", async () => {
    const olderDeployment = await factory.Deployment.create({
      projectId: project.id,
      createdAt: "2017-02-04T17:14:28.167Z",
      slug: "deployment-first",
    });
    await factory.Deployment.create({
      projectId: project.id,
      createdAt: "2017-02-03T17:14:28.167Z",
      slug: "deployment-ignored",
    });
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      createdAt: "2017-02-05T17:14:28.167Z",
      environment: "production",
      status: "pending",
      branch: "feat/deployments",
      commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      slug: "deployment-latest",
    });

    await factory.Deployment.create();

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
          project(
            accountSlug: "${teamAccount.slug}",
            projectName: "${project.name}",
          ) {
            deployments(
              first: 2,
              after: 0,
            ) {
              pageInfo {
                totalCount
                hasNextPage
              }
              edges {
                id
                status
                environment
                branch
                commitSha
                url
                createdAt
              }
            }
          }
        }`,
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    const { deployments } = res.body.data.project;
    expect(deployments).toEqual({
      pageInfo: {
        hasNextPage: true,
        totalCount: 3,
      },
      edges: [
        {
          id: formatDeploymentId(deployment.id),
          status: "pending",
          environment: "production",
          branch: "feat/deployments",
          commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          url: deployment.url,
          createdAt: "2017-02-05T17:14:28.167Z",
        },
        {
          id: formatDeploymentId(olderDeployment.id),
          status: "ready",
          environment: "preview",
          branch: "main",
          commitSha: "0000000000000000000000000000000000000001",
          url: olderDeployment.url,
          createdAt: "2017-02-04T17:14:28.167Z",
        },
      ],
    });
  });
});
