import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL Build.reviews", () => {
  test("returns all submitted reviews for a build", async () => {
    await setupDatabase();

    const account = await factory.UserAccount.create();
    await account.$fetchGraph("user");
    invariant(account.user, "user relation not found");

    const project = await factory.Project.create({ accountId: account.id });
    const build = await factory.Build.create({ projectId: project.id });

    const olderReview = await factory.BuildReview.create({
      buildId: build.id,
      userId: account.user.id,
      state: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newerReview = await factory.BuildReview.create({
      buildId: build.id,
      userId: account.user.id,
      state: "rejected",
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: account.user,
        account,
      },
    );

    const result = await request(app)
      .post("/graphql")
      .send({
        query: `
          query BuildReviews(
            $accountSlug: String!
            $projectName: String!
            $buildNumber: Int!
          ) {
            project(accountSlug: $accountSlug, projectName: $projectName) {
              build(number: $buildNumber) {
                reviews {
                  id
                  state
                }
              }
            }
          }
        `,
        variables: {
          accountSlug: account.slug,
          projectName: project.name,
          buildNumber: build.number,
        },
      });

    expectNoGraphQLError(result);
    expect(result.status).toBe(200);
    expect(result.body.data.project.build.reviews).toEqual([
      { id: newerReview.id, state: "REJECTED" },
      { id: olderReview.id, state: "APPROVED" },
    ]);
  });
});
