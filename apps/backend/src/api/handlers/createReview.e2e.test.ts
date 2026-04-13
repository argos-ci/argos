import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { concludeBuild } from "@/build/concludeBuild";
import {
  Build,
  BuildReview,
  Project,
  ScreenshotBucket,
  ScreenshotDiff,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { createReview } from "./createReview";

const app = createTestHandlerApp(createReview);

const test = base.extend<{
  user: User;
  project: Project;
  compareBucket: ScreenshotBucket;
  build: Build;
  screenshotDiffs: ScreenshotDiff[];
  scopedPatToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  project: async ({ user }, use) => {
    const [userAccount, teamAccount] = await Promise.all([
      factory.UserAccount.create({ userId: user.id }),
      factory.TeamAccount.create({ slug: "acme" }),
    ]);
    const project = await factory.Project.create({
      accountId: teamAccount.id,
      name: "web",
      token: "the-awesome-token",
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: user.id,
      userLevel: "owner",
    });

    await use(project);
    void userAccount;
  },
  compareBucket: async ({ project }, use) => {
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature/review-api",
      commit: "b".repeat(40),
    });
    await use(compareBucket);
  },
  build: async ({ project, compareBucket }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      conclusion: null,
    });
    await use(build);
  },
  screenshotDiffs: async ({ build }, use) => {
    const screenshots = await factory.Screenshot.createMany(3);
    const screenshotDiffs = await factory.ScreenshotDiff.createMany(2, [
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[1]!.id,
        score: 0.2,
      },
      {
        buildId: build.id,
        baseScreenshotId: screenshots[0]!.id,
        compareScreenshotId: screenshots[2]!.id,
        score: 0.4,
      },
    ]);
    await concludeBuild({ build, notify: false });
    await use(screenshotDiffs);
  },
  scopedPatToken: async ({ user, project }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: project.accountId,
    });
    await use(token);
  },
});

describe("createReview", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("creates a review and returns it", async ({
    user,
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        conclusion: "REQUEST_CHANGES",
        snapshots: [
          {
            id: screenshotDiffs[0]!.id,
            conclusion: "REQUEST_CHANGES",
          },
        ],
      })
      .expect(200);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      buildId: build.id,
      state: "rejected",
      userId: user.id,
    });

    const review = await BuildReview.query()
      .findById(res.body.id)
      .withGraphFetched("screenshotDiffReviews");

    expect(review).toMatchObject({
      buildId: build.id,
      state: "rejected",
    });
    expect(review?.screenshotDiffReviews).toHaveLength(1);
    expect(review?.screenshotDiffReviews?.[0]).toMatchObject({
      screenshotDiffId: screenshotDiffs[0]!.id,
      state: "rejected",
    });
  });

  test("rejects project tokens", async ({ build }) => {
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", "Bearer the-awesome-token")
      .send({
        conclusion: "APPROVE",
        snapshots: [],
      })
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toContain(
          "Creating a review requires a personal access token.",
        );
        expect(res.body.error).toContain("https://argos-ci.com/docs");
      });
  });
});
