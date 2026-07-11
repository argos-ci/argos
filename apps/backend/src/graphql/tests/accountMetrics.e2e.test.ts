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
