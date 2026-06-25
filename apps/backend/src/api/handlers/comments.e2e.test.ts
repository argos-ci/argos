import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { concludeBuild } from "@/build/concludeBuild";
import {
  Account,
  Build,
  Comment,
  CommentNotificationSubscription,
  Project,
  ScreenshotBucket,
  ScreenshotDiff,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { addCommentReaction } from "./addCommentReaction";
import { createComment } from "./createComment";
import { deleteComment } from "./deleteComment";
import { getComment } from "./getComment";
import { listComments } from "./listComments";
import { removeCommentReaction } from "./removeCommentReaction";
import {
  resolveCommentThread,
  unresolveCommentThread,
} from "./resolveCommentThread";
import {
  subscribeCommentThread,
  unsubscribeCommentThread,
} from "./subscribeCommentThread";
import { updateComment } from "./updateComment";

const app = createTestHandlerApp((ctx) => {
  createComment(ctx);
  listComments(ctx);
  getComment(ctx);
  updateComment(ctx);
  deleteComment(ctx);
  addCommentReaction(ctx);
  removeCommentReaction(ctx);
  resolveCommentThread(ctx);
  unresolveCommentThread(ctx);
  subscribeCommentThread(ctx);
  unsubscribeCommentThread(ctx);
});

const DOC = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
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
      branch: "feature/comment-api",
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

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("createComment", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("posts a comment from Markdown", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: "Looks **broken** on mobile" })
      .expect(201);

    expect(res.body).toMatchObject({
      buildId: build.id,
      threadId: null,
      pending: false,
      author: { id: expect.any(String) },
    });
    expect(res.body.text).toContain("Looks broken on mobile");
    expect(JSON.stringify(res.body.body)).toContain("bold");

    const comment = await Comment.query().findById(res.body.id);
    expect(comment?.userId).toBe(user.id);
  });

  test("posts a comment from raw rich-text JSON", async ({
    build,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: DOC("Hello world") })
      .expect(201);

    expect(res.body.text).toBe("Hello world");
  });

  test("replies to a thread", async ({ user, build, scopedPatToken }) => {
    const root = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Root"),
    });

    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: "A reply", threadId: root.id })
      .expect(201);

    expect(res.body.threadId).toBe(root.id);
  });

  test("attaches to a pending review with addToReview", async ({
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    void screenshotDiffs;
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: "Draft note", addToReview: true })
      .expect(201);

    expect(res.body.pending).toBe(true);
    const comment = await Comment.query().findById(res.body.id);
    expect(comment?.buildReviewId).not.toBeNull();
  });

  test("anchors a comment to a screenshot diff", async ({
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({
        body: "Off by a pixel",
        screenshotDiffId: screenshotDiffs[0]!.id,
        anchor: { type: "point", x: 0.5, y: 0.5 },
      })
      .expect(201);

    expect(res.body.screenshotDiffId).toBe(screenshotDiffs[0]!.id);
    expect(res.body.anchor).toEqual({ type: "point", x: 0.5, y: 0.5 });
  });

  test("anchors a comment to a line range", async ({
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({
        body: "These lines regressed",
        screenshotDiffId: screenshotDiffs[0]!.id,
        anchor: { type: "lines", from: 2, to: 5 },
      })
      .expect(201);

    expect(res.body.anchor).toEqual({ type: "lines", from: 2, to: 5 });
  });

  test("rejects an inverted line range", async ({
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({
        body: "bad range",
        screenshotDiffId: screenshotDiffs[0]!.id,
        anchor: { type: "lines", from: 5, to: 2 },
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toEqual(expect.any(String));
      });
  });

  test("rejects an anchor without a screenshot diff", async ({
    build,
    scopedPatToken,
  }) => {
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({ body: "x", anchor: { type: "point", x: 0.5, y: 0.5 } })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toEqual(expect.any(String));
      });
  });

  test("rejects an anchored reply", async ({
    user,
    build,
    screenshotDiffs,
    scopedPatToken,
  }) => {
    const root = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Root"),
    });
    await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .send({
        body: "reply",
        threadId: root.id,
        screenshotDiffId: screenshotDiffs[0]!.id,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toEqual(expect.any(String));
      });
  });

  test("rejects project tokens", async ({ build }) => {
    const res = await request(app)
      .post(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth("the-awesome-token"))
      .send({ body: "nope" })
      .expect(401);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe("listComments / getComment", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("lists visible comments and hides others' drafts", async ({
    user,
    otherUser,
    build,
    scopedPatToken,
  }) => {
    await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Visible"),
    });
    const otherPending = await factory.BuildReview.create({
      buildId: build.id,
      userId: otherUser.id,
      state: "pending",
    });
    await factory.Comment.create({
      buildId: build.id,
      userId: otherUser.id,
      buildReviewId: otherPending.id,
      content: DOC("Hidden draft"),
    });

    const res = await request(app)
      .get(`/projects/acme/web/builds/${build.number}/comments`)
      .set(auth(scopedPatToken))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].text).toBe("Visible");
  });

  test("gets a single comment", async ({ user, build, scopedPatToken }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("One comment"),
    });

    const res = await request(app)
      .get(`/projects/acme/web/builds/${build.number}/comments/${comment.id}`)
      .set(auth(scopedPatToken))
      .expect(200);

    expect(res.body).toMatchObject({ id: comment.id, text: "One comment" });
  });

  test("returns 404 for a deleted comment", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Gone"),
      deletedAt: new Date().toISOString(),
    });

    const res = await request(app)
      .get(`/projects/acme/web/builds/${build.number}/comments/${comment.id}`)
      .set(auth(scopedPatToken))
      .expect(404);
    expect(res.body.error).toEqual(expect.any(String));
  });

  test("returns 404 for another user's draft comment", async ({
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const pending = await factory.BuildReview.create({
      buildId: build.id,
      userId: otherUser.id,
      state: "pending",
    });
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: otherUser.id,
      buildReviewId: pending.id,
      content: DOC("Secret"),
    });

    const res = await request(app)
      .get(`/projects/acme/web/builds/${build.number}/comments/${comment.id}`)
      .set(auth(scopedPatToken))
      .expect(404);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe("updateComment / deleteComment", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("author can edit their comment", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Before"),
    });

    const res = await request(app)
      .patch(`/projects/acme/web/builds/${build.number}/comments/${comment.id}`)
      .set(auth(scopedPatToken))
      .send({ body: "After" })
      .expect(200);

    expect(res.body.text).toBe("After");
    expect(res.body.editedAt).toEqual(expect.any(String));
  });

  test("non-author cannot edit", async ({
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: otherUser.id,
      content: DOC("Theirs"),
    });

    await request(app)
      .patch(`/projects/acme/web/builds/${build.number}/comments/${comment.id}`)
      .set(auth(scopedPatToken))
      .send({ body: "hijack" })
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toEqual(expect.any(String));
      });
  });

  test("author can delete their comment", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Delete me"),
    });

    await request(app)
      .delete(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}`,
      )
      .set(auth(scopedPatToken))
      .expect(200);

    const reloaded = await Comment.query().findById(comment.id);
    expect(reloaded?.deletedAt).not.toBeNull();
  });

  test("non-author cannot delete", async ({
    otherUser,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: otherUser.id,
      content: DOC("Theirs"),
    });

    await request(app)
      .delete(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}`,
      )
      .set(auth(scopedPatToken))
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toEqual(expect.any(String));
      });
  });
});

describe("reactions", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("adds and removes a reaction", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("React to me"),
    });

    const added = await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/reactions`,
      )
      .set(auth(scopedPatToken))
      .send({ emoji: "👍" })
      .expect(200);

    const account = await Account.query().findOne({ userId: user.id });
    expect(added.body.reactions).toEqual([
      {
        emoji: "👍",
        count: 1,
        users: [
          { id: account!.id, slug: account!.slug, name: account!.displayName },
        ],
      },
    ]);

    const removed = await request(app)
      .delete(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/reactions`,
      )
      .query({ emoji: "👍" })
      .set(auth(scopedPatToken))
      .expect(200);

    expect(removed.body.reactions).toEqual([]);
  });

  test("rejects an invalid emoji", async ({ user, build, scopedPatToken }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("React to me"),
    });

    await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/reactions`,
      )
      .set(auth(scopedPatToken))
      .send({ emoji: "not-an-emoji" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toEqual(expect.any(String));
      });
  });
});

describe("thread resolve / subscription", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("resolves and reopens a thread", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Thread"),
    });

    const resolved = await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/resolve`,
      )
      .set(auth(scopedPatToken))
      .expect(200);
    expect(resolved.body.resolvedAt).toEqual(expect.any(String));

    const reopened = await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/unresolve`,
      )
      .set(auth(scopedPatToken))
      .expect(200);
    expect(reopened.body.resolvedAt).toBeNull();
  });

  test("subscribes and unsubscribes from a thread", async ({
    user,
    build,
    scopedPatToken,
  }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      userId: user.id,
      content: DOC("Thread"),
    });

    await request(app)
      .post(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/subscription`,
      )
      .set(auth(scopedPatToken))
      .expect(200);

    let subscription = await CommentNotificationSubscription.query().findOne({
      commentId: comment.id,
      userId: user.id,
    });
    expect(subscription?.isSubscribed()).toBe(true);

    await request(app)
      .delete(
        `/projects/acme/web/builds/${build.number}/comments/${comment.id}/subscription`,
      )
      .set(auth(scopedPatToken))
      .expect(200);

    subscription = await CommentNotificationSubscription.query().findOne({
      commentId: comment.id,
      userId: user.id,
    });
    expect(subscription?.isSubscribed()).toBe(false);
  });
});
