import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { DeploymentAlias, Project, ProjectDomain } from "@/database/models";
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
      domain: "docs.dev.argos-ci.live",
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
      domain: "docs.dev.argos-ci.live",
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
      domain: "docs.dev.argos-ci.live",
    });
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "production",
      status: "ready",
    });
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "docs.dev.argos-ci.live",
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

  it("returns a field error when the domain is already used by another project", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: teamAccount.id,
    });
    const otherProject = await factory.Project.create({
      accountId: teamAccount.id,
      name: "other-project",
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });
    await factory.ProjectDomain.create({
      projectId: otherProject.id,
      domain: "taken.dev.argos-ci.live",
      environment: "production",
      internal: true,
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
            }
          }
        `,
        variables: {
          input: {
            projectId: project.id,
            domain: "taken.dev.argos-ci.live",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe("Domain already in use");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "domain",
    });
  });

  it("disables project deployments", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: teamAccount.id,
    });
    invariant(userAccount.user, "user not fetched");
    invariant(userAccount.userId, "user account has no user");
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: userAccount.userId,
      userLevel: "owner",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation DisableProjectDeployments($projectId: ID!) {
            disableProjectDeployments(projectId: $projectId) {
              id
              deploymentEnabled
            }
          }
        `,
        variables: {
          projectId: project.id,
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.disableProjectDeployments).toEqual({
      id: project.id,
      deploymentEnabled: false,
    });

    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      deploymentEnabled: false,
    });
  });

  it("enables project deployments", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: teamAccount.id,
      deploymentEnabled: false,
    });
    invariant(userAccount.user, "user not fetched");
    invariant(userAccount.userId, "user account has no user");
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: userAccount.userId,
      userLevel: "owner",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation EnableProjectDeployments($projectId: ID!) {
            enableProjectDeployments(projectId: $projectId) {
              id
              deploymentEnabled
            }
          }
        `,
        variables: {
          projectId: project.id,
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.enableProjectDeployments).toEqual({
      id: project.id,
      deploymentEnabled: true,
    });

    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      deploymentEnabled: true,
    });
  });
});
