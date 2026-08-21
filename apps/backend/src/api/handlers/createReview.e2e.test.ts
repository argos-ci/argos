import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { concludeBuild } from "@/build/concludeBuild";
import {
  Account,
  Build,
  BuildReview,
  Comment,
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

  test("creates a review and returns it (event)", async ({
    user,
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        event: "REJECT",
        snapshots: [
          {
            id: screenshotDiffs[0]!.id,
            conclusion: "REQUEST_CHANGES",
          },
        ],
      })
      .expect(200);

    const userAccount = await Account.query().findOne({ userId: user.id });
    expect(res.body).toMatchObject({
      id: expect.any(String),
      buildId: build.id,
      state: "rejected",
      user: { id: userAccount!.id, slug: userAccount!.slug },
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

  test("creates a comment review with a body", async ({
    build,
    scopedPatToken,
  }) => {
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Looks good to me" }],
        },
      ],
    };
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        event: "COMMENT",
        body,
      })
      .expect(200);

    expect(res.body).toMatchObject({
      buildId: build.id,
      state: "commented",
    });

    const comments = await Comment.query().where({
      buildReviewId: res.body.id,
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.content).toEqual(body);
    expect(comments[0]?.agent).toBeNull();
  });

  test("records the agent on a review and on its comment", async ({
    build,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .set("user-agent", "argos-cli/6.9.0 node/22.11.0 agent/claude")
      .send({ event: "COMMENT", body: "Reviewed the diffs, all intentional." })
      .expect(200);

    expect(res.body.agent).toEqual({ id: "claude-code", name: "Claude Code" });

    const review = await BuildReview.query().findById(res.body.id);
    expect(review?.agent).toBe("claude-code");

    // A review's body is stored as a comment like any other, so it carries the
    // same attribution — otherwise the one comment an agent is most likely to
    // leave is the one that looks hand-written.
    const comments = await Comment.query().where({
      buildReviewId: res.body.id,
    });
    expect(comments[0]?.agent).toBe("claude-code");
  });

  test("records the agent on a review with no body at all", async ({
    build,
    scopedPatToken,
  }) => {
    // Approving without a word is the common case, so the review is the only
    // place the attribution can live — there is no comment to carry it.
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .set("user-agent", "argos-cli/6.9.0 node/22.11.0 agent/cursor")
      .send({ event: "APPROVE" })
      .expect(200);

    expect(res.body.agent).toEqual({ id: "cursor", name: "Cursor" });
    const review = await BuildReview.query().findById(res.body.id);
    expect(review?.agent).toBe("cursor");
  });

  test("records no agent when a person reviews directly", async ({
    build,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .set("user-agent", "argos-cli/6.9.0 node/22.11.0")
      .send({ event: "APPROVE" })
      .expect(200);

    expect(res.body.agent).toBeNull();
    const review = await BuildReview.query().findById(res.body.id);
    expect(review?.agent).toBeNull();
  });

  test("supports the deprecated conclusion field", async ({
    build,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        conclusion: "APPROVE",
        snapshots: [],
      })
      .expect(200);

    expect(res.body).toMatchObject({
      buildId: build.id,
      state: "approved",
    });
  });

  test("maps deprecated REQUEST_CHANGES conclusion to rejected", async ({
    build,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        conclusion: "REQUEST_CHANGES",
        snapshots: [],
      })
      .expect(200);

    expect(res.body).toMatchObject({
      buildId: build.id,
      state: "rejected",
    });
  });

  test("returns 400 when body is not a valid rich-text document", async ({
    build,
    scopedPatToken,
  }) => {
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        event: "COMMENT",
        body: {
          type: "doc",
          content: [{ type: "unknownNode" }],
        },
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid request");
        expect(res.body.details).toEqual([
          { message: expect.stringContaining("Invalid comment body") },
        ]);
      });
  });

  test("returns 400 when a snapshot belongs to another build", async ({
    project,
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    const otherBuild = await factory.Build.create({
      projectId: project.id,
      conclusion: null,
    });
    const screenshots = await factory.Screenshot.createMany(2);
    const otherDiff = await factory.ScreenshotDiff.create({
      buildId: otherBuild.id,
      baseScreenshotId: screenshots[0]!.id,
      compareScreenshotId: screenshots[1]!.id,
      score: 0.4,
    });

    // An agent reviewing with stale ids has to hear about it: a 200 here would
    // report a review that recorded none of the decisions it sent.
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        event: "APPROVE",
        snapshots: [
          { id: screenshotDiffs[0]!.id, conclusion: "APPROVE" },
          { id: otherDiff.id, conclusion: "APPROVE" },
        ],
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain(otherDiff.id);
      });

    const reviews = await BuildReview.query().where({ buildId: build.id });
    expect(reviews).toHaveLength(0);
  });

  test("returns 400 when neither event nor conclusion is provided", async ({
    build,
    scopedPatToken,
  }) => {
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .send({
        snapshots: [],
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain(
          "Either `event` or `conclusion` is required",
        );
      });
  });

  test("rejects project tokens", async ({ build }) => {
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/reviews`)
      .set("Authorization", "Bearer the-awesome-token")
      .send({
        event: "APPROVE",
        snapshots: [],
      })
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toContain(
          "This endpoint requires a personal access token.",
        );
        expect(res.body.error).toContain("https://argos-ci.com/docs");
      });
  });
});
