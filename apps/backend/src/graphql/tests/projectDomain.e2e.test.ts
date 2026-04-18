import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { DeploymentAlias, ProjectDomain } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL projectDomain", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns the project production domain", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: teamAccount.id,
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });
    await factory.ProjectDomain.create({
      projectId: project.id,
      domain: "docs.argos-ci.live",
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
          project(accountSlug: "${teamAccount.slug}", projectName: "${project.name}") {
            id
            domain
          }
        }`,
      });

    expectNoGraphQLError(res);
    expect(res.body.data.project).toEqual({
      id: project.id,
      domain: "docs.argos-ci.live",
    });
  });

  it("updates the project production domain and syncs the alias", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: teamAccount.id,
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });
    await factory.ProjectDomain.create({
      projectId: project.id,
      domain: "docs.argos-ci.live",
    });
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "production",
      status: "ready",
    });
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "docs.argos-ci.live",
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
        query: `
          mutation UpdateProjectDomain($input: UpdateProjectDomainInput!) {
            updateProjectDomain(input: $input) {
              id
              domain
            }
          }
        `,
        variables: {
          input: {
            projectId: project.id,
            domain: "marketing.dev.argos-ci.live",
          },
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.updateProjectDomain).toEqual({
      id: project.id,
      domain: "marketing.dev.argos-ci.live",
    });

    await expect(
      ProjectDomain.query().findOne({
        projectId: project.id,
        environment: "production",
        internal: true,
      }),
    ).resolves.toMatchObject({
      domain: "marketing.dev.argos-ci.live",
    });

    await expect(
      DeploymentAlias.query().findOne({
        deploymentId: deployment.id,
        alias: "marketing.dev.argos-ci.live",
      }),
    ).resolves.toBeTruthy();
  });
});
