import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { concludeBuild } from "@/build/concludeBuild";
import { Account, Build, Project, Screenshot } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

type Fixtures = {
  fixture: {
    userAccount: Account;
    project: Project;
    firstBuild: Build;
    secondBuild: Build;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const userAccount = await factory.UserAccount.create();
    const [project] = await Promise.all([
      factory.Project.create({
        accountId: userAccount.id,
      }),
      userAccount.$fetchGraph("user"),
    ]);

    async function createBuild() {
      const baseBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "main",
      });
      const baseScreenshots = await factory.Screenshot.createMany(3, {
        screenshotBucketId: baseBucket.id,
      });
      const compareBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "main",
      });
      const files = await factory.File.createMany(3, {
        type: "screenshot",
      });
      const compareScreenshots = await factory.Screenshot.createMany(3, [
        {
          screenshotBucketId: compareBucket.id,
          fileId: files[0]!.id,
        },
        {
          screenshotBucketId: compareBucket.id,
          fileId: files[1]!.id,
        },
        {
          screenshotBucketId: compareBucket.id,
          fileId: files[2]!.id,
        },
      ]);
      const build = await factory.Build.create({
        projectId: project.id,
        conclusion: null,
        baseScreenshotBucketId: baseBucket.id,
        compareScreenshotBucketId: compareBucket.id,
      });
      await factory.ScreenshotDiff.createMany(3, [
        {
          buildId: build.id,
          baseScreenshotId: baseScreenshots[0]!.id,
          compareScreenshotId: compareScreenshots[0]!.id,
          score: 0,
        },
        {
          buildId: build.id,
          baseScreenshotId: baseScreenshots[1]!.id,
          compareScreenshotId: compareScreenshots[1]!.id,
          score: 0.3,
        },
        {
          buildId: build.id,
          baseScreenshotId: baseScreenshots[2]!.id,
          compareScreenshotId: compareScreenshots[2]!.id,
          score: 0,
        },
      ]);
      await concludeBuild({ build, notify: false });
      const freshBuild = await build
        .$query()
        .withGraphFetched("screenshotDiffs");
      return freshBuild;
    }

    const firstBuild = await createBuild();
    const buildReview = await factory.BuildReview.create({
      buildId: firstBuild.id,
      userId: userAccount.userId!,
      state: "approved",
    });
    await factory.ScreenshotDiffReview.createMany(3, [
      {
        buildReviewId: buildReview.id,
        screenshotDiffId: firstBuild.screenshotDiffs![0]!.id,
        state: "approved",
      },
      {
        buildReviewId: buildReview.id,
        screenshotDiffId: firstBuild.screenshotDiffs![1]!.id,
        state: "rejected",
      },
      {
        buildReviewId: buildReview.id,
        screenshotDiffId: firstBuild.screenshotDiffs![2]!.id,
        state: "approved",
      },
    ]);
    const secondBuild = await createBuild();
    const [firstBuildScreenshots, secondBuildScreenshots] = await Promise.all([
      Screenshot.query()
        .where("screenshotBucketId", firstBuild.compareScreenshotBucketId)
        .orderBy("id", "desc"),
      Screenshot.query()
        .where("screenshotBucketId", secondBuild.compareScreenshotBucketId)
        .orderBy("id", "desc"),
    ]);

    // Copy fileId from first build screenshots to second build screenshots
    await Promise.all(
      firstBuildScreenshots.map(async (s1, i) => {
        const s2 = secondBuildScreenshots[i];
        await s2!.$query().patch({
          fileId: s1.fileId,
        });
      }),
    );

    await use({
      firstBuild,
      secondBuild,
      userAccount,
      project,
    });
  },
});

describe("GraphQL Build.branchApprovedDiffs", () => {
  test("returns approved screenshot diffs", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: fixture.userAccount.user!,
        account: fixture.userAccount,
      },
    );
    const result = await request(app)
      .post("/graphql")
      .send({
        query: `
            {
              project(
                accountSlug: "${fixture.userAccount.slug}",
                projectName: "${fixture.project.name}",
              ) {
                build(number: 2) {
                  branchApprovedDiffs
                }
              }
            }
          `,
      });
    expectNoGraphQLError(result);
    expect(result.status).toBe(200);
    const [first, , last] = await fixture.secondBuild
      .$relatedQuery("screenshotDiffs")
      .select("id");
    expect(result.body.data.project.build.branchApprovedDiffs.sort()).toEqual(
      [first, last].map((diff) => diff!.id).sort(),
    );
  });
});
