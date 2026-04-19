import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL Deployment.aliases", () => {
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

  it("returns deployment aliases with their type and url", async () => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      slug: "sparkle-main-preview",
    });

    const branchAlias = await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "sparkle-main-acme",
      type: "branch",
    });

    const domainAlias = await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "sparkle-acme.dev.argos-ci.live",
      type: "domain",
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
                aliases {
                  id
                  type
                  url
                }
              }
            }
          }
        }`,
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.project.deployments.edges[0].aliases).toEqual([
      {
        id: branchAlias.id,
        type: "branch",
        url: "https://sparkle-main-acme.dev.argos-ci.live/",
      },
      {
        id: domainAlias.id,
        type: "domain",
        url: "https://sparkle-acme.dev.argos-ci.live/",
      },
    ]);
  });
});
