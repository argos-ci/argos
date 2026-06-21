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
import { dismissReview } from "./dismissReview";
import { listReviews } from "./listReviews";

const app = createTestHandlerApp((ctx) => {
  listReviews(ctx);
  dismissReview(ctx);
});

const test = base.extend<{
  user: User;
  otherUser: User;
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
  otherUser: async ({ user }, use) => {
    const otherUser = await factory.User.create();
    await use(otherUser);
    void user;
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

describe("listReviews", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("lists submitted reviews and the viewer's own pending review", async ({
    user,
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const [approved] = await Promise.all([
      factory.BuildReview.create({
        buildId: build.id,
        userId: otherUser.id,
        state: "approved",
      }),
      // Hidden: another user's pending draft.
      factory.BuildReview.create({
        buildId: build.id,
        userId: otherUser.id,
        state: "pending",
      }),
      // Visible: the viewer's own pending draft.
      factory.BuildReview.create({
        buildId: build.id,
        userId: user.id,
        state: "pending",
      }),
    ]);

    const res = await request(app)
      .get(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    const states = res.body.map((r: { state: string }) => r.state).sort();
    expect(states).toEqual(["approved", "pending"]);
    expect(res.body).toContainEqual(
      expect.objectContaining({ id: approved.id, state: "approved" }),
    );
  });

  test("rejects project tokens", async ({ build }) => {
    const res = await request(app)
      .get(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect(401);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe("dismissReview", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("dismisses a submitted review and returns it", async ({
    user,
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const review = await factory.BuildReview.create({
      buildId: build.id,
      userId: otherUser.id,
      state: "approved",
    });

    const res = await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/reviews/${review.id}/dismiss`,
      )
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: review.id,
      state: "approved",
      dismissedById: user.id,
    });
    expect(res.body.dismissedAt).toEqual(expect.any(String));

    const reloaded = await BuildReview.query().findById(review.id);
    expect(reloaded?.dismissedById).toBe(user.id);
    expect(reloaded?.dismissedAt).not.toBeNull();
  });

  test("returns 400 for a pending review", async ({
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const review = await factory.BuildReview.create({
      buildId: build.id,
      userId: otherUser.id,
      state: "pending",
    });

    await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/reviews/${review.id}/dismiss`,
      )
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("pending");
      });
  });

  test("returns 400 when already dismissed", async ({
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const review = await factory.BuildReview.create({
      buildId: build.id,
      userId: otherUser.id,
      state: "approved",
      dismissedAt: new Date().toISOString(),
      dismissedById: otherUser.id,
    });

    await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/reviews/${review.id}/dismiss`,
      )
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("already dismissed");
      });
  });

  test("returns 404 for a review on another build", async ({
    otherUser,
    project,
    build,
    scopedPatToken,
  }) => {
    const otherBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });
    const otherBuild = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: otherBucket.id,
    });
    const review = await factory.BuildReview.create({
      buildId: otherBuild.id,
      userId: otherUser.id,
      state: "approved",
    });

    const res = await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/reviews/${review.id}/dismiss`,
      )
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(404);
    expect(res.body.error).toEqual(expect.any(String));
  });
});
