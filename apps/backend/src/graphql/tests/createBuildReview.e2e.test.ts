import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { concludeBuild } from "@/build/concludeBuild";
import {
  Account,
  Build,
  BuildReview,
  Project,
  ScreenshotDiff,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

type Fixtures = {
  fixture: {
    userAccount: Account;
    teamAccount: Account;
    project: Project;
    build: Build;
    screenshotDiffs: ScreenshotDiff[];
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [userAccount, teamAccount] = await Promise.all([
      factory.UserAccount.create(),
      factory.TeamAccount.create(),
    ]);
    const [project] = await Promise.all([
      factory.Project.create({
        accountId: teamAccount.id,
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId!,
        userId: userAccount.userId!,
        userLevel: "owner",
      }),
      userAccount.$fetchGraph("user"),
      teamAccount.$fetchGraph("team"),
    ]);
    const build = await factory.Build.create({
      projectId: project.id,
      conclusion: null,
    });
    const screenshots = await factory.Screenshot.createMany(3);
    const screenshotDiffs = await factory.ScreenshotDiff.createMany(3, [
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[1]!.id,
        score: 0,
      },
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[1]!.id,
        score: 0.3,
      },
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[2]!.id,
        score: 0,
      },
    ]);
    await concludeBuild({ build, notify: false });
    const freshBuild = await build.$query();
    await use({
      build: freshBuild,
      userAccount,
      teamAccount,
      project,
      screenshotDiffs,
    });
  },
});

describe("GraphQL createBuildReview mutation", () => {
  test("creates a review", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: fixture.userAccount.user!,
        account: fixture.userAccount,
      },
    );
    const mutationResult = await request(app)
      .post("/graphql")
      .send({
        query: `
            mutation CreateBuildReview($input: CreateBuildReviewInput!) {
              createBuildReview(
                input: $input
              ) {
                status
              }
            }
          `,
        variables: {
          input: {
            buildId: fixture.build.id,
            event: "REJECT",
            screenshotDiffReviews: [
              {
                screenshotDiffId: fixture.screenshotDiffs[0]!.id,
                state: "REJECTED",
              },
            ],
          },
        },
      });
    expect(mutationResult.body.data.createBuildReview.status).toBe("REJECTED");

    const review = await BuildReview.query()
      .findOne({
        buildId: fixture.build.id,
        userId: fixture.userAccount.user!.id,
      })
      .withGraphFetched("screenshotDiffReviews");

    expect(review!.state).toBe("rejected");
    expect(review!.screenshotDiffReviews).toHaveLength(1);
    expect(review!.screenshotDiffReviews![0]!.screenshotDiffId).toBe(
      fixture.screenshotDiffs[0]!.id,
    );
    expect(review!.screenshotDiffReviews![0]!.state).toBe("rejected");

    expectNoGraphQLError(mutationResult);
    expect(mutationResult.status).toBe(200);

    const projectResult = await request(app)
      .post("/graphql")
      .send({
        query: `{
            project(
              accountSlug: "${fixture.teamAccount.slug}",
              projectName: "${fixture.project.name}",
            ) {
              build(number: 1) {
                status
              }
            }
          }`,
      });
    expectNoGraphQLError(projectResult);
    expect(projectResult.status).toBe(200);
    expect(projectResult.body.data.project.build.status).toBe("REJECTED");
  });

  test("returns an error if unauthorized", async ({ fixture }) => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
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
            mutation CreateBuildReview($input: CreateBuildReviewInput!) {
              createBuildReview(
                input: $input
              ) {
                status
              }
            }
          `,
        variables: {
          input: {
            buildId: fixture.build.id,
            event: "APPROVE",
            screenshotDiffReviews: [],
          },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.errors[0].message).toBe(
      "You cannot approve or reject this build",
    );
  });

  test("dismisses a review", async ({ fixture }) => {
    const reviewer = fixture.userAccount.user;
    invariant(reviewer, "fixture user should be fetched");
    const review = await factory.BuildReview.create({
      buildId: fixture.build.id,
      userId: reviewer.id,
      state: "rejected",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: reviewer,
        account: fixture.userAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation DismissReview($input: DismissReviewInput!) {
            dismissReview(input: $input) {
              status
              reviews {
                id
                state
                dismissedAt
                dismissedBy {
                  id
                  slug
                }
              }
            }
          }
        `,
        variables: {
          input: {
            reviewId: review.id,
          },
        },
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.dismissReview.status).toBe("CHANGES_DETECTED");
    expect(res.body.data.dismissReview.reviews).toContainEqual({
      id: review.id,
      state: "REJECTED",
      dismissedAt: expect.any(String),
      dismissedBy: {
        id: fixture.userAccount.id,
        slug: fixture.userAccount.slug,
      },
    });

    const refreshed = await BuildReview.query().findById(review.id);
    invariant(refreshed, "review should exist");
    expect(refreshed.dismissedAt).toEqual(expect.any(Date));
    expect(refreshed.dismissedById).toBe(reviewer.id);
  });

  test("returns an error if the user cannot dismiss reviews", async ({
    fixture,
  }) => {
    const owner = fixture.userAccount.user;
    invariant(owner, "fixture user should be fetched");
    const review = await factory.BuildReview.create({
      buildId: fixture.build.id,
      userId: owner.id,
      state: "rejected",
    });
    const reviewerAccount = await factory.UserAccount.create();
    await reviewerAccount.$fetchGraph("user");
    const reviewer = reviewerAccount.user;
    invariant(reviewer, "reviewer user should be fetched");
    const teamId = fixture.teamAccount.teamId;
    invariant(teamId, "fixture team should exist");
    await Promise.all([
      fixture.project.$query().patch({ defaultUserLevel: "reviewer" }),
      factory.TeamUser.create({
        teamId,
        userId: reviewer.id,
        userLevel: "contributor",
      }),
    ]);
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: reviewer,
        account: reviewerAccount,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation DismissReview($input: DismissReviewInput!) {
            dismissReview(input: $input) {
              status
            }
          }
        `,
        variables: {
          input: {
            reviewId: review.id,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors[0].message).toBe("You cannot dismiss this review");
  });
});
