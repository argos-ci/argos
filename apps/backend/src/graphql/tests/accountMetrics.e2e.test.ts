import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const ACCOUNT_METRICS_QUERY = `
  query AccountMetrics(
    $accountSlug: String!
    $from: DateTime!
    $to: DateTime!
    $projectNames: [String!]
  ) {
    account(slug: $accountSlug) {
      metrics(
        input: {
          from: $from
          to: $to
          groupBy: day
          projectNames: $projectNames
        }
      ) {
        screenshots {
          all {
            total
            projects
          }
          projects {
            id
            name
          }
        }
        builds {
          all {
            total
            projects
          }
          projects {
            id
            name
          }
        }
      }
    }
  }
`;

describe("GraphQL Account.metrics", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("filters metrics by project names", async () => {
    const user = await factory.User.create();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const [webProject, docsProject] = await Promise.all([
      factory.Project.create({ accountId: account.id, name: "web" }),
      factory.Project.create({ accountId: account.id, name: "docs" }),
    ]);
    await factory.ScreenshotBucket.createMany(2, [
      {
        projectId: webProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
        screenshotCount: 2,
      },
      {
        projectId: docsProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
        screenshotCount: 3,
      },
    ]);
    await factory.Build.createMany(2, [
      {
        projectId: webProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
      },
      {
        projectId: docsProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
      },
    ]);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_METRICS_QUERY,
        variables: {
          accountSlug: account.slug,
          from: "2020-12-31T00:00:00.000Z",
          to: "2021-01-02T00:00:00.000Z",
          projectNames: [webProject.name],
        },
      });

    expectNoGraphQLError(result);
    expect(result.body.data.account.metrics).toMatchObject({
      screenshots: {
        all: {
          total: 2,
          projects: { [webProject.id]: 2 },
        },
        projects: [{ id: webProject.id, name: webProject.name }],
      },
      builds: {
        all: {
          total: 1,
          projects: { [webProject.id]: 1 },
        },
        projects: [{ id: webProject.id, name: webProject.name }],
      },
    });
  });

  it("still counts a deleted project's consumption", async () => {
    // Deleting a project does not hand the screenshots back: the account
    // consumed them, and the invoice still bills them. If the chart dropped
    // them it would disagree with the meter on the same page.
    const user = await factory.User.create();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
    });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date("2021-01-01").toISOString(),
      screenshotCount: 7,
    });
    await factory.Build.create({
      projectId: project.id,
      createdAt: new Date("2021-01-01").toISOString(),
    });
    await project.$query().patch({
      name: `deleted-${project.id}-web`,
      deletedAt: new Date().toISOString(),
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_METRICS_QUERY,
        variables: {
          accountSlug: account.slug,
          from: "2020-12-31T00:00:00.000Z",
          to: "2021-01-02T00:00:00.000Z",
        },
      });

    expectNoGraphQLError(result);
    expect(result.body.data.account.metrics).toMatchObject({
      screenshots: {
        all: { total: 7, projects: { [project.id]: 7 } },
        // Labelled by the parked name, which is what makes the series legible
        // as a project that is gone.
        projects: [{ id: project.id, name: `deleted-${project.id}-web` }],
      },
      builds: {
        all: { total: 1, projects: { [project.id]: 1 } },
      },
    });
  });

  it("does not list a team's private projects to a visitor of a public one", async () => {
    const visitor = await factory.User.create();
    const visitorAccount = await factory.UserAccount.create({
      userId: visitor.id,
    });
    const team = await factory.TeamAccount.create();
    const [publicProject, privateProject] = await Promise.all([
      factory.Project.create({
        accountId: team.id,
        name: "oss",
        private: false,
      }),
      factory.Project.create({
        accountId: team.id,
        name: "secret",
        private: true,
      }),
    ]);
    await factory.ScreenshotBucket.create({
      projectId: privateProject.id,
      createdAt: new Date("2021-01-01").toISOString(),
      screenshotCount: 3,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: visitor, account: visitorAccount },
    );
    const result = await request(app)
      .post("/graphql")
      .send({
        query: `
          query PublicProjectAccountMetrics($accountSlug: String!, $projectName: String!) {
            project(accountSlug: $accountSlug, projectName: $projectName) {
              account {
                metrics(
                  input: {
                    from: "2020-12-31T00:00:00.000Z"
                    to: "2021-01-02T00:00:00.000Z"
                    groupBy: day
                  }
                ) {
                  screenshots { projects { id name } }
                }
              }
            }
          }
        `,
        variables: {
          accountSlug: team.slug,
          projectName: publicProject.name,
        },
      });

    expect(result.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(JSON.stringify(result.body)).not.toContain(privateProject.name);
  });

  it("limits a contributor to the projects they were given", async () => {
    const user = await factory.User.create();
    const userAccount = await factory.UserAccount.create({ userId: user.id });
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "contributor",
    });
    const [webProject, secretProject] = await Promise.all([
      factory.Project.create({ accountId: account.id, name: "web" }),
      factory.Project.create({ accountId: account.id, name: "secret" }),
    ]);
    await factory.ProjectUser.create({
      projectId: webProject.id,
      userId: user.id,
      userLevel: "viewer",
    });
    await factory.ScreenshotBucket.createMany(2, [
      {
        projectId: webProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
        screenshotCount: 2,
      },
      {
        projectId: secretProject.id,
        createdAt: new Date("2021-01-01").toISOString(),
        screenshotCount: 3,
      },
    ]);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );
    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_METRICS_QUERY,
        variables: {
          accountSlug: account.slug,
          from: "2020-12-31T00:00:00.000Z",
          to: "2021-01-02T00:00:00.000Z",
        },
      });

    expectNoGraphQLError(result);
    expect(result.body.data.account.metrics.screenshots).toMatchObject({
      all: { total: 2, projects: { [webProject.id]: 2 } },
      projects: [{ id: webProject.id, name: webProject.name }],
    });
  });

  it("reports invalid date ranges as bad user input", async () => {
    const user = await factory.User.create();
    const account = await factory.UserAccount.create({ userId: user.id });
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const result = await request(app)
      .post("/graphql")
      .send({
        query: ACCOUNT_METRICS_QUERY,
        variables: {
          accountSlug: account.slug,
          from: "2021-01-02T00:00:00.000Z",
          to: "2021-01-01T00:00:00.000Z",
        },
      });

    expect(result.body.errors).toEqual([
      expect.objectContaining({
        message: "`from` must be before `to`.",
        extensions: expect.objectContaining({
          code: "BAD_USER_INPUT",
          field: ["from", "to"],
        }),
      }),
    ]);
  });
});
